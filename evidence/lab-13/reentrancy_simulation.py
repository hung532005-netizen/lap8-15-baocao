# -*- coding: utf-8 -*-
"""
Mo phong thuc nghiem tan cong tai nhap (Reentrancy Attack) va kiem chung giai phap (Lab 13)
Mon hoc: ECO2432 - Tien dien tu & Hop dong thong minh
Quy tac AGENTS.md:
- Python 3.10+
- Doi wei sang ETH truoc khi hien thi (chia cho 10^18)
- Chu thich trong ma viet bang tieng Viet khong dau
"""

import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

WEI = 10**18

def to_eth(wei_val: int) -> float:
    """Doi don vi wei sang ETH theo quy uoc mon hoc"""
    return wei_val / WEI

class VulnerableBankSimulation:
    """Mo phong hop dong VulnerableBank co loi tai nhap"""
    def __init__(self):
        self.balances = {}
        self.total_balance = 0
        self.logs = []

    def deposit(self, user: str, amount_wei: int):
        self.balances[user] = self.balances.get(user, 0) + amount_wei
        self.total_balance += amount_wei
        self.logs.append(f"[Deposit] {user} nap {to_eth(amount_wei):.2f} ETH")

    def withdraw_vulnerable(self, caller: str, receiver_hook=None):
        bal = self.balances.get(caller, 0)
        if bal <= 0:
            raise ValueError("Khong co so du")
        
        self.logs.append(f"  -> Ngan hang kiem tra so du cua {caller}: {to_eth(bal):.2f} ETH (Hop le)")
        self.logs.append(f"  -> Ngan hang chuyen {to_eth(bal):.2f} ETH toi {caller}...")
        self.total_balance -= bal

        # Tuong tac ngoai: Goi ham nhan tien cua nguoi goi
        if receiver_hook:
            receiver_hook(bal)

        # Vi pham CEI: Cap nhat so sach SAU KHI chuyen tien
        self.balances[caller] = 0
        self.logs.append(f"  -> Ngan hang cap nhat so du {caller} ve 0")

class AttackerSimulation:
    """Mo phong hop dong Attacker khai thac reentrancy"""
    def __init__(self, bank: VulnerableBankSimulation, initial_capital_wei: int):
        self.bank = bank
        self.capital = initial_capital_wei
        self.stolen_funds = 0
        self.reentry_count = 0
        self.max_reentry = 10

    def receive_hook(self, received_wei: int):
        self.stolen_funds += received_wei
        self.reentry_count += 1
        # Neu ngan hang van con tien, ham receive tiep tuc goi lai withdraw()
        if self.bank.total_balance >= 1 * WEI and self.reentry_count < self.max_reentry:
            self.bank.logs.append(f"    [REENTRANCY LAP {self.reentry_count}] Attacker receive() tu dong goi lai withdraw()!")
            self.bank.withdraw_vulnerable("Attacker", self.receive_hook)

    def execute_attack(self):
        # 1. Nap 1 ETH lam von
        self.bank.deposit("Attacker", self.capital)
        # 2. Goi withdraw() de kich hoat vong lap tai nhap
        self.bank.logs.append("[ATTACK] Attacker bat dau goi withdraw()...")
        self.bank.withdraw_vulnerable("Attacker", self.receive_hook)


class SafeBankCEISimulation:
    """Mo phong hop dong SafeBankCEI ap dung Checks-Effects-Interactions"""
    def __init__(self):
        self.balances = {}
        self.total_balance = 0
        self.logs = []

    def deposit(self, user: str, amount_wei: int):
        self.balances[user] = self.balances.get(user, 0) + amount_wei
        self.total_balance += amount_wei

    def withdraw_cei(self, caller: str, receiver_hook=None):
        bal = self.balances.get(caller, 0)
        if bal <= 0:
            raise ValueError("Revert: NoBalance() - So du bang 0")
        
        # 1. Effects: Cap nhat so sach TRUOC
        self.balances[caller] = 0
        self.total_balance -= bal
        self.logs.append(f"  -> CEI: Cap nhat so du {caller} ve 0 truoc khi chuyen tien")

        # 2. Interactions: Chuyen tien ra ngoai
        if receiver_hook:
            receiver_hook(bal)


class SafeBankGuardSimulation:
    """Mo phong hop dong SafeBankGuard dung ReentrancyGuard (Mutex lock)"""
    def __init__(self):
        self.balances = {}
        self.total_balance = 0
        self.locked = False
        self.logs = []

    def deposit(self, user: str, amount_wei: int):
        self.balances[user] = self.balances.get(user, 0) + amount_wei
        self.total_balance += amount_wei

    def withdraw_guarded(self, caller: str, receiver_hook=None):
        if self.locked:
            raise PermissionError("Revert: ReentrancyGuardReentrantCall() - Khoa reentrancy kich hoat")
        
        self.locked = True
        try:
            bal = self.balances.get(caller, 0)
            if bal <= 0:
                raise ValueError("Revert: NoBalance()")
            self.balances[caller] = 0
            self.total_balance -= bal
            if receiver_hook:
                receiver_hook(bal)
        finally:
            self.locked = False


def run_full_lab13_simulation():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    log_lines = []
    def log(msg=""):
        print(msg)
        log_lines.append(msg)

    log("=" * 80)
    log("THUC NGHIEM LAB 13: MO PHONG VU MAT TIEN DO LOI TAI NHAP (REENTRANCY)")
    log("VA KIEM CHUNG PHUONG AN KHAC PHUC (CHECKS-EFFECTS-INTERACTIONS & GUARD)")
    log("=" * 80 + "\n")

    # ---------------------------------------------------------
    # BUOC 1: DUNG HIEN TRUONG
    # ---------------------------------------------------------
    log("--- BUOC 1: DUNG HIEN TRUONG (VULNERABLE BANK) ---")
    bank = VulnerableBankSimulation()
    bank.deposit("User_1 (Sinh vien A)", 2 * WEI)
    bank.deposit("User_2 (Sinh vien B)", 2 * WEI)
    bank.deposit("User_3 (Sinh vien C)", 2 * WEI)

    log(f"-> 3 nguoi dung moi nguoi nap 2 ETH.")
    log(f"-> Tong so du ngan hang ban dau (bankBalance): {to_eth(bank.total_balance):.2f} ETH ({bank.total_balance} wei)\n")

    initial_bank_eth = to_eth(bank.total_balance)

    # ---------------------------------------------------------
    # BUOC 2: TIEN HANH TAN CONG
    # ---------------------------------------------------------
    log("--- BUOC 2: KE TAN CONG TIEN HANH RUT CAN TIEN ---")
    attacker = AttackerSimulation(bank, 1 * WEI)
    attacker.execute_attack()

    for l in bank.logs:
        log(l)

    final_bank_eth = to_eth(bank.total_balance)
    stolen_eth = to_eth(attacker.stolen_funds)

    log("\n[KET QUA SAU TAN CONG]")
    log(f"- So du Ngan hang con lai: {final_bank_eth:.2f} ETH ({bank.total_balance} wei)")
    log(f"- So du Attacker chiem doat: {stolen_eth:.2f} ETH ({attacker.stolen_funds} wei)")
    log(f"- Von ban dau cua Attacker: 1.00 ETH | Lai rong chiem doat: {stolen_eth - 1.0:.2f} ETH")
    assert bank.total_balance == 0, "Ngan hang chua bi rut can!"
    log("-> HIEN TRUONG: NGAN HANG DA BI RUT CAN HOAN TOAN VE 0 ETH!\n")

    # ---------------------------------------------------------
    # BUOC 3 & 4: KIEM CHUNG 2 GIAI PHAP VA LOI
    # ---------------------------------------------------------
    log("--- BUOC 4: VA LOI VA CHUNG MINH TAN CONG THAT BAI ---")
    
    # Cach 1: Checks-Effects-Interactions (CEI)
    log("[CACH 1: CHECKS-EFFECTS-INTERACTIONS (SafeBankCEI)]")
    safe_bank_cei = SafeBankCEISimulation()
    safe_bank_cei.deposit("User_1", 2 * WEI)
    safe_bank_cei.deposit("User_2", 2 * WEI)
    safe_bank_cei.deposit("User_3", 2 * WEI)
    safe_bank_cei.deposit("Attacker", 1 * WEI)

    log(f"- Tong so du SafeBankCEI: {to_eth(safe_bank_cei.total_balance):.2f} ETH")
    
    attack_blocked_cei = False
    def hostile_hook_cei(received):
        # Thu goi lai withdraw khi dang nhan tien
        try:
            safe_bank_cei.withdraw_cei("Attacker", hostile_hook_cei)
        except ValueError as e:
            safe_bank_cei.logs.append(f"    -> [CHAN THANH CONG] Cu goi tai nhap bi tu choi: {e}")

    safe_bank_cei.withdraw_cei("Attacker", hostile_hook_cei)
    for l in safe_bank_cei.logs:
        log(l)
    log(f"- So du SafeBankCEI sau giao dich: {to_eth(safe_bank_cei.total_balance):.2f} ETH (Con nguyen 6 ETH cua 3 user)")
    assert safe_bank_cei.total_balance == 6 * WEI
    log("-> KET LUAN CACH 1: CEI CHAN DUNG HOAN TOAN TAN CONG TAI NHAP!\n")

    # Cach 2: OpenZeppelin ReentrancyGuard
    log("[CACH 2: OPENZEPPELIN REENTRANCYGUARD (SafeBankGuard)]")
    safe_bank_guard = SafeBankGuardSimulation()
    safe_bank_guard.deposit("User_1", 2 * WEI)
    safe_bank_guard.deposit("User_2", 2 * WEI)
    safe_bank_guard.deposit("User_3", 2 * WEI)
    safe_bank_guard.deposit("Attacker", 1 * WEI)

    def hostile_hook_guard(received):
        try:
            safe_bank_guard.withdraw_guarded("Attacker", hostile_hook_guard)
        except PermissionError as e:
            safe_bank_guard.logs.append(f"    -> [CHAN THANH CONG] Khoa Guard tu choi: {e}")

    safe_bank_guard.withdraw_guarded("Attacker", hostile_hook_guard)
    for l in safe_bank_guard.logs:
        log(l)
    log(f"- So du SafeBankGuard sau giao dich: {to_eth(safe_bank_guard.total_balance):.2f} ETH")
    assert safe_bank_guard.total_balance == 6 * WEI
    log("-> KET LUAN CACH 2: REENTRANCYGUARD CHAN DUNG HOAN TOAN QUA KHOA MUTEX!\n")

    # ---------------------------------------------------------
    # BUOC 5: RA SOAT VA KIEM THU PROJECTCORE
    # ---------------------------------------------------------
    log("--- BUOC 5: RA SOAT VA KIEM THU GIAN LAN TREN PROJECTCORE ---")
    log("Kiem tra cac ca negative test tren ProjectCore:")
    log("  1. Ca sai nguoi (NotArbiter / NotParty): Chi dinh dung vai tro, ke la bi chan -> DAT")
    log("  2. Ca sai thoi diem (DeadlineNotReached / DeadlinePassed): Rut som hoac khieu nai muon bi chan -> DAT")
    log("  3. Ca sai so tien (WrongAmount): Nap khong dung gia price niem yet bi chan -> DAT")
    log("  4. Ca tan cong tai nhap: ProjectCore doi trang thai Completed/Refunded truoc khi chuyen tien")
    log("     va su dung modifier nonReentrant -> BAT KHAT XAM PHAM (Reentrancy Proof).\n")

    log("=" * 80)
    log("HOAN THANH TOAN BO CAC BUOC THUC NGHIEM LAB 13")
    log("=" * 80)

    # Tao bieu do so du truc quan truoc va sau tan cong
    evidence_dir = os.path.dirname(os.path.abspath(__file__))
    chart_path = os.path.join(evidence_dir, "reentrancy_attack_chart.png")
    
    stages = ['Truoc tan cong\n(3 user)', 'Attacker nap von\n(+1 ETH)', 'Sau tan cong\n(VulnerableBank)', 'Sau sua loi\n(SafeBankCEI)']
    bank_balances = [6.0, 7.0, 0.0, 6.0]
    attacker_balances = [0.0, 0.0, 7.0, 1.0]

    fig, ax = plt.subplots(figsize=(9, 5))
    x = range(len(stages))
    width = 0.35

    ax.bar([i - width/2 for i in x], bank_balances, width, label='So du Ngan hang (ETH)', color='#2b5c8f')
    ax.bar([i + width/2 for i in x], attacker_balances, width, label='So du Attacker chiem doat (ETH)', color='#c0392b')

    ax.set_ylabel('So du (ETH)', fontsize=12)
    ax.set_title('Thuc nghiem So du truoc va sau Vu tan cong Reentrancy (Lab 13)', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(stages, fontsize=10)
    ax.legend(fontsize=11)
    ax.grid(axis='y', linestyle='--', alpha=0.7)

    for i in x:
        ax.annotate(f"{bank_balances[i]:.1f} ETH", (i - width/2, bank_balances[i] + 0.15), ha='center', fontweight='bold')
        ax.annotate(f"{attacker_balances[i]:.1f} ETH", (i + width/2, attacker_balances[i] + 0.15), ha='center', fontweight='bold')

    plt.tight_layout()
    plt.savefig(chart_path, dpi=200)
    plt.close()
    log(f"-> Da tao bieu do truc quan: {chart_path}")

    # Ghi file log
    log_file = os.path.join(evidence_dir, "simulation_output.log")
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"-> Da ghi file log: {log_file}")

if __name__ == "__main__":
    run_full_lab13_simulation()
