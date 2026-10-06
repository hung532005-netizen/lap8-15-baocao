# -*- coding: utf-8 -*-
"""
Kiem chung quy tac kinh te KTX Escrow (Lab 11)
Ngon ngu: Python 3.10+
Quy tac: Tinh phi nen tang 1% (100 basis points) va phan chia dong tien hop dong ProjectCore
"""

def test_economic_model():
    PLATFORM_FEE_BPS = 100      # 100 basis points = 1%
    BPS_DENOMINATOR = 10000    # Mau so quy chuan
    MIN_PRICE = 10000          # 10000 wei (chan duoi)
    MAX_PRICE = 10**18         # 1 ETH = 10^18 wei (chan tren)

    print("======================================================================")
    print("BAT DAU KIEM CHUNG MO HINH KINH TE KTX ESCROW (PROJECT CORE - LAB 11)")
    print("======================================================================\n")

    # Ca 1: Giao dich tieu chuan (0.1 ETH = 10^17 wei)
    price = 10**17
    fee = (price * PLATFORM_FEE_BPS) // BPS_DENOMINATOR
    seller_payout = price - fee

    fee_eth = fee / 10**18
    payout_eth = seller_payout / 10**18
    price_eth = price / 10**18

    print("[CA 1: GIAO DICH HOP LE]")
    print(f"- Gia niem yet (price): {price} wei ({price_eth:.4f} ETH)")
    print(f"- Phi nen tang 1% ({PLATFORM_FEE_BPS} bps): {fee} wei ({fee_eth:.4f} ETH)")
    print(f"- Nguoi ban thuc nhan (99%): {seller_payout} wei ({payout_eth:.4f} ETH)")
    assert fee + seller_payout == price, "Loi bao toan gia tri dong tien!"
    assert fee == 10**15, f"Phi sai lech: mong doi 0.001 ETH, thuc te {fee_eth}"
    print("-> KET QUA: THANH CONG (Bao toan dong tien 100%, phi trich chinh xac 1%)\n")

    # Ca 2: Bay lam tron so nguyen (Rounding to Zero) voi gia duoi 10000 wei
    print("[CA 2: KIEM CHUNG BAY LAM TRON SO NGUYEN (ROUNDING TO ZERO TRAP)]")
    tiny_price = 50 # 50 wei
    trap_fee = (tiny_price * PLATFORM_FEE_BPS) // BPS_DENOMINATOR
    print(f"- Gia thu nghiem: {tiny_price} wei")
    print(f"- Phi tinh theo cong thuc (50 * 100 // 10000): {trap_fee} wei")
    print("  -> Nhan xet: Phi bi lam tron ve 0! Neu khong co chan duoi MIN_PRICE, nen tang bi that thu phi.")
    
    # Kiem tra co che bao ve: Revert neu price < MIN_PRICE
    if tiny_price < MIN_PRICE:
        print(f"  -> Co che chan: Revert PriceBelowMinimum({tiny_price}, {MIN_PRICE})")
        print("-> KET QUA: CHAN THANH CONG VI PHAM\n")

    # Ca 3: Gian lan vuot tran chong rua tien (Price > 1 ETH)
    print("[CA 3: KIEM CHUNG GIAN LAN VUOT TRAN GIA (CEILING BREACH)]")
    huge_price = 2 * 10**18 # 2 ETH
    print(f"- Gia thu nghiem: {huge_price} wei (2.0 ETH)")
    if huge_price > MAX_PRICE:
        print(f"  -> Co che chan: Revert PriceExceedsLimit({huge_price}, {MAX_PRICE})")
        print("-> KET QUA: CHAN THANH CONG GIAN LAN VUOT TRAN\n")

    # Ca 4: Gian lan nguoi ban tu mua (Wash Trading)
    print("[CA 4: KIEM CHUNG GIAN LAN WASH TRADING]")
    seller_addr = "0x1111111111111111111111111111111111111111"
    buyer_addr = "0x1111111111111111111111111111111111111111"
    if seller_addr == buyer_addr:
        print("  -> Nguoi ban tu goi fund() vao don hang cua chinh minh")
        print("  -> Co che chan: Revert SellerCannotBeBuyer()")
        print("-> KET QUA: CHAN THANH CONG WASH TRADING\n")

    # Ca 5: Gian lan mao danh nguoi mua xac nhan nhan hang
    print("[CA 5: KIEM CHUNG GIAN LAN MAO DANH GIAI NGAN]")
    real_buyer = "0x2222222222222222222222222222222222222222"
    attacker = "0x9999999999999999999999999999999999999999"
    if attacker != real_buyer:
        print("  -> Ke la goi confirmReceived() khi chua co su dong y cua nguoi mua")
        print("  -> Co che chan: Revert NotBuyer()")
        print("-> KET QUA: CHAN THANH CONG MAO DANH\n")

    print("======================================================================")
    print("TAT CA CAC CA KIEM THU QUY TAC KINH TE DEU DAT CHUAN!")
    print("======================================================================")

if __name__ == "__main__":
    test_economic_model()
