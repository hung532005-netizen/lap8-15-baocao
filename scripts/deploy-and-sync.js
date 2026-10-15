/**
 * SCRIPT DEPLOY PROJECTCORE.SOL V2.0 & DONG BO TU DONG (BACKEND + FRONTEND)
 * Chay lenh: npx hardhat run scripts/deploy-and-sync.js --network sepolia
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("==================================================================");
  console.log("BAT DAU TRIEN KHAI PROJECTCORE.SOL V2.0 (KTX TRUONG BIA)");
  console.log("==================================================================");

  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Mang muc tieu : ${hre.network.name} (Chain ID: ${chainId})`);

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("Khong tim thay tai khoan Deployer! Vui long kiem tra DEPLOYER_PRIVATE_KEY trong file .env.");
  }

  const deployerAddress = await deployer.getAddress();
  const balanceWei = await hre.ethers.provider.getBalance(deployerAddress);
  const balanceEth = hre.ethers.formatEther(balanceWei);

  console.log(`Vi Deployer   : ${deployerAddress}`);
  console.log(`So du hien tai: ${balanceEth} ETH`);

  if (balanceWei === 0n) {
    throw new Error("Vi Deployer co so du bang 0 ETH! Vui long nap SepoliaETH truoc khi deploy.");
  }

  // Xac dinh dia chi Trong tai KTX (Arbiter) va Vi nhan phi (Fee Recipient)
  const arbiterAddress =
    process.env.ARBITER_ADDRESS && hre.ethers.isAddress(process.env.ARBITER_ADDRESS)
      ? process.env.ARBITER_ADDRESS
      : deployerAddress;

  const feeRecipientAddress =
    process.env.FEE_RECIPIENT_ADDRESS && hre.ethers.isAddress(process.env.FEE_RECIPIENT_ADDRESS)
      ? process.env.FEE_RECIPIENT_ADDRESS
      : deployerAddress;

  console.log(`Trong tai KTX : ${arbiterAddress}`);
  console.log(`Vi nhan phi   : ${feeRecipientAddress}`);

  // 1. Trien khai hop dong ProjectCore.sol
  console.log("\nDang gui giao dich khoi tao hop dong len mang...");
  const ProjectCoreFactory = await hre.ethers.getContractFactory("contracts/ProjectCore.sol:ProjectCore");
  const contract = await ProjectCoreFactory.deploy(arbiterAddress, feeRecipientAddress);

  const deployTx = contract.deploymentTransaction();
  console.log(`Tx Hash       : ${deployTx.hash}`);
  console.log("Dang cho xac nhan block (waitForDeployment)...");

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`DEPLOY THANH CONG! Dia chi ProjectCore: ${contractAddress}`);

  // 2. Kiem tra lai trang thai hop dong truc tiep tren chuoi (On-chain Verification)
  const onChainOwner = await contract.owner();
  const onChainArbiter = await contract.arbiter();
  const onChainFeeBps = await contract.platformFeeBps();

  console.log("\nXac thuc du lieu On-chain sau khi trien khai:");
  console.log(`   - Owner (Super Admin) : ${onChainOwner}`);
  console.log(`   - Arbiter (Trong tai) : ${onChainArbiter}`);
  console.log(`   - Phi nen tang        : ${Number(onChainFeeBps) / 100}% (${onChainFeeBps} bps)`);

  // Lay ABI chuan tu Artifact bien dich cua Hardhat
  const artifact = await hre.artifacts.readArtifact("contracts/ProjectCore.sol:ProjectCore");
  const deployedMetadata = {
    contractName: "ProjectCore",
    version: "2.0.0",
    network: hre.network.name,
    chainId,
    contractAddress,
    owner: onChainOwner,
    arbiter: onChainArbiter,
    feeRecipient: feeRecipientAddress,
    platformFeeBps: Number(onChainFeeBps),
    deployTxHash: deployTx.hash,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi
  };

  // 3. DONG BO SANG BACKEND (backend/.env & backend/contract-artifact.json)
  syncToBackend(deployedMetadata);

  // 4. DONG BO SANG FRONTEND (web/contract-config.js & web/index.html & root index.html)
  syncToFrontend(deployedMetadata);

  console.log("\n==================================================================");
  console.log("HOAN TAT DEPLOY VA DONG BO DIA CHI CONTRACT TOAN HE THONG!");
  if (chainId === 11155111) {
    console.log(`Xem tren Sepolia Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  }
  console.log("==================================================================");
}

/**
 * Tu dong cap nhat file backend/.env va xuat backend/contract-artifact.json
 */
function syncToBackend(meta) {
  const backendDir = path.join(__dirname, "..", "backend");
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }

  // 3.1. Ghi file backend/contract-artifact.json
  const artifactPath = path.join(backendDir, "contract-artifact.json");
  fs.writeFileSync(artifactPath, JSON.stringify(meta, null, 2), "utf8");
  console.log(`\n[Backend] Da xuat ABI & Metadata tai: backend/contract-artifact.json`);

  // 3.2. Cap nhat hoac tao moi file backend/.env
  const backendEnvPath = path.join(backendDir, ".env");
  const adminWallets = Array.from(
    new Set([meta.owner.toLowerCase(), meta.arbiter.toLowerCase()])
  ).join(",");

  let envContent = "";
  if (fs.existsSync(backendEnvPath)) {
    envContent = fs.readFileSync(backendEnvPath, "utf8");
    envContent = upsertEnvVar(envContent, "CONTRACT_ADDRESS", meta.contractAddress);
    envContent = upsertEnvVar(
      envContent,
      "SEPOLIA_RPC_URL",
      process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
    );
    envContent = upsertEnvVar(envContent, "ADMIN_WALLETS", adminWallets);
  } else {
    envContent = [
      "PORT=4000",
      "JWT_SECRET=ktx_truong_bia_super_secret_jwt_key_2026",
      `SEPOLIA_RPC_URL=${process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"}`,
      `CONTRACT_ADDRESS=${meta.contractAddress}`,
      `ADMIN_WALLETS=${adminWallets}`,
      "MAX_IMAGE_SIZE_KB=2048",
      ""
    ].join("\n");
  }

  fs.writeFileSync(backendEnvPath, envContent, "utf8");
  console.log(`[Backend] Da dong bo CONTRACT_ADDRESS=${meta.contractAddress} vao backend/.env`);
}

/**
 * Tu dong xuat web/contract-config.js va cap nhat dia chi trong web/index.html & index.html
 */
function syncToFrontend(meta) {
  const rootDir = path.join(__dirname, "..");
  const webDir = path.join(rootDir, "web");
  if (!fs.existsSync(webDir)) {
    fs.mkdirSync(webDir, { recursive: true });
  }

  // 4.1. Tao file web/contract-config.js va root contract-config.js
  const configJsContent = `/**
 * FILE TU DONG SINH BOI scripts/deploy-and-sync.js
 * Thoi diem cap nhat: ${meta.deployedAt}
 */
window.KTX_CONTRACT_CONFIG = ${JSON.stringify(
    {
      contractAddress: meta.contractAddress,
      chainId: meta.chainId,
      chainIdHex: "0x" + meta.chainId.toString(16),
      networkName: meta.network,
      owner: meta.owner,
      arbiter: meta.arbiter,
      feeRecipient: meta.feeRecipient,
      platformFeeBps: meta.platformFeeBps,
      deployTxHash: meta.deployTxHash,
      deployedAt: meta.deployedAt,
      abi: meta.abi
    },
    null,
    2
  )};
`;
  fs.writeFileSync(path.join(webDir, "contract-config.js"), configJsContent, "utf8");
  fs.writeFileSync(path.join(rootDir, "contract-config.js"), configJsContent, "utf8");
  console.log(`[Frontend] Da tao file cau hinh tai: web/contract-config.js va contract-config.js`);

  // 4.2. Cap nhat truc tiep hang so CONTRACT_ADDRESS trong web/index.html va root index.html
  [path.join(webDir, "index.html"), path.join(rootDir, "index.html")].forEach((htmlPath) => {
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, "utf8");
      let updatedCount = 0;

      const addressRegex =
        /((?:const|let|var|CONTRACT_ADDRESS:)\s*["'])0x[a-fA-F0-9]{40}(["'])/g;

      html = html.replace(addressRegex, (match, prefix, suffix) => {
        updatedCount++;
        return `${prefix}${meta.contractAddress}${suffix}`;
      });

      fs.writeFileSync(htmlPath, html, "utf8");
      console.log(`[Frontend] Da cap nhat ${updatedCount} vi tri dia chi contract tai: ${path.basename(path.dirname(htmlPath))}/${path.basename(htmlPath)}`);
    }
  });
}

function upsertEnvVar(envContent, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(envContent)) {
    return envContent.replace(regex, `${key}=${value}`);
  }
  return envContent.trimEnd() + `\n${key}=${value}\n`;
}

main().catch((error) => {
  console.error("\nLOI TRIEN KHAI HOP DONG:", error.message || error);
  process.exitCode = 1;
});
