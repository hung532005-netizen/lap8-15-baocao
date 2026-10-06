# -*- coding: utf-8 -*-
"""
Script tu dong dong bo tien trinh do an KTX Escrow (Lab 8 - Lab 15)
Ngon ngu: Python 3.10+
Chuc nang: Quet thu muc evidence tung Lab de tu dong cap nhat
trang thai Hoan thanh vao README.md va docs/PROJECT_PLAN.md moi khi chay dong bo.
"""

import sys
import re
from pathlib import Path

# Thiet lap ma hoa UTF-8 cho console tren Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent

# Dinh nghia cac tieu chi kiem tra hoan thanh dua tren evidence folder va file bat buoc
LAB_CRITERIA = {
    8: {
        "name": "Lab 8",
        "evidence_dirs": ["evidence/lab-08"],
        "desc": "Khởi động đồ án Chủ đề 1 (KTX Trường Bia Escrow), xác định 4 câu hỏi cốt lõi, thiết lập cơ chế ký quỹ on-chain, phác thảo Smart Contract & bộ 3 ca kiểm thử",
        "deliverables": "`README.md` · `AGENTS.md` · `docs/SPEC.md`"
    },
    9: {
        "name": "Lab 9",
        "evidence_dirs": ["evidence/lab-09"],
        "desc": "Học kỹ thuật két khóa thời gian: Checks-Effects-Interactions, custom error, đo gas 4 thao tác trên Remix VM",
        "deliverables": "`contracts/training/TimeLockVault.sol` · `evidence/lab-09/`"
    },
    10: {
        "name": "Lab 10",
        "evidence_dirs": ["evidence/lab-10"],
        "desc": "Rà soát mã nguồn AI sinh ra: thực nghiệm đọc ô nhớ `private` bằng `eth_getStorageAt`, vá lỗi CEI và xung đột lợi ích trọng tài trong `ProjectCore`",
        "deliverables": "`contracts/project/ProjectCore.sol` · `evidence/lab-10/` · `docs/AI_JOURNAL.md`"
    },
    11: {
        "name": "Lab 11",
        "evidence_dirs": ["evidence/lab-11"],
        "desc": "Cài quy tắc kinh tế vào sản phẩm: phí nền tảng 1% (100 bps), trần giá giao dịch, kiểm thử 1 ca hợp lệ và 1 ca cố tình vi phạm",
        "deliverables": "`contracts/project/ProjectCore.sol` · `docs/ECONOMIC_RULES.md` · `evidence/lab-11/`"
    },
    12: {
        "name": "Lab 12",
        "evidence_dirs": ["evidence/lab-12"],
        "desc": "Gate Review 1 (Cổng duyệt bắt buộc): kiểm tra sức khỏe repo, demo 3 phút luồng cốt lõi và ca vi phạm bị chặn",
        "deliverables": "`docs/GATE_REVIEW_1.md` · `docs/PROJECT_PLAN.md`"
    },
    13: {
        "name": "Lab 13",
        "evidence_dirs": ["evidence/lab-13"],
        "desc": "Thực nghiệm vụ mất tiền do lỗi Reentrancy (vụ The DAO 2016), viết ca kiểm thử tấn công và vá lỗi cho `ProjectCore`",
        "deliverables": "`contracts/training/VulnerableBank.sol` · `evidence/lab-13/` · `docs/AI_JOURNAL.md`"
    },
    14: {
        "name": "Lab 14",
        "evidence_dirs": ["evidence/lab-14"],
        "desc": "Rà soát chéo giữa các nhóm theo danh mục kiểm tra 10 hạng mục bắt buộc",
        "deliverables": "`docs/AUDIT_REPORT.md`"
    },
    15: {
        "name": "Lab 15",
        "evidence_dirs": ["evidence/lab-15"],
        "desc": "Giao diện Web3 DApp kết nối MetaMask, đưa lên mạng công khai GitHub Pages và kịch bản demo bảo vệ đồ án",
        "deliverables": "`web/index.html` · `docs/PRESENTATION_PLAN.md`"
    }
}

def check_lab_status(lab_num):
    info = LAB_CRITERIA[lab_num]
    for rel_path in info["evidence_dirs"]:
        full_path = BASE_DIR / rel_path
        if not full_path.exists():
            return "🔄 **Sắp triển khai**"
    return "✅ **Hoàn thành**"

def update_readme():
    readme_path = BASE_DIR / "README.md"
    if not readme_path.exists():
        print(f"[LOI] Khong tim thay {readme_path}")
        return

    content = readme_path.read_text(encoding="utf-8")

    lines = [
        "## 📦 Danh mục Sản phẩm & Lộ trình Triển khai Đồ án (Lab 8 – 15)",
        "",
        "| Giai đoạn | Sản phẩm bàn giao | Mô tả Nghiệp vụ & Kỹ thuật | Trạng thái |",
        "| :---: | :--- | :--- | :---: |"
    ]

    for num in range(8, 16):
        status = check_lab_status(num)
        info = LAB_CRITERIA[num]
        lines.append(f"| **Lab {num}** | {info['deliverables']} | {info['desc']} | {status} |")

    lines.append("")
    lines.append("> **Chú thích trạng thái:** ✅ Hoàn thành &nbsp;|&nbsp; 🔄 Sắp triển khai &nbsp;|&nbsp; ⏸ Tạm hoãn")

    new_section = "\n".join(lines)

    pattern = re.compile(
        r"## 📦 Danh mục Sản phẩm & Lộ trình Triển khai Đồ án \(Lab 8 – 15\).*?> \*\*Chú thích trạng thái:\*\*.*?\n",
        re.DOTALL
    )

    if pattern.search(content):
        updated_content = pattern.sub(new_section + "\n", content)
    else:
        updated_content = content + "\n\n" + new_section + "\n"

    readme_path.write_text(updated_content, encoding="utf-8")
    print("[THANH CONG] Da cap nhat tien trinh vao README.md")

def update_project_plan():
    plan_path = BASE_DIR / "docs" / "PROJECT_PLAN.md"
    if not plan_path.exists():
        return

    content = plan_path.read_text(encoding="utf-8")

    lines = [
        "## 3. Mốc tiến độ bắt buộc (Milestones)",
        "",
        "| Mốc | Tên nhiệm vụ | Kết quả đầu ra bắt buộc | Trách nhiệm chính | Trạng thái |",
        "| :---: | :--- | :--- | :---: | :---: |"
    ]

    milestones_info = {
        8: ("Khởi tạo codebase nhóm & Quy tắc kinh tế", "Repo nhóm chuẩn B.6, `PROJECT_PLAN.md`, `SPEC.md`, `ECONOMIC_RULES.md`, cam kết 1 câu", "Toàn bộ nhóm"),
        9: ("Hợp đồng lõi biên dịch được", "`contracts/project/ProjectCore.sol` biên dịch 0 lỗi trên Remix, đo gas thực tế", "Hùng (Contract)"),
        10: ("Audit và sửa lỗi có bằng chứng", "Kiểm tra Reentrancy, Checks-Effects-Interactions, log `AI_JOURNAL.md`", "An (Testing)"),
        11: ("Quy tắc kinh tế chạy đúng", "Test phí ký quỹ (1%), phạt bùng kèo, hoàn tiền sau hạn", "Hùng (Contract)"),
        12: ("**Gate Review 1**", "Báo cáo tiến độ giữa kỳ, demo tương tác hợp đồng trên Remix trước lớp", "Toàn bộ nhóm"),
        13: ("Test ca tấn công & gian lận", "Kịch bản tấn công: giam vốn, spam đơn, claim tiền sai vai trò", "Hùng (Audit)"),
        14: ("Audit chéo (Peer-audit)", "Biên bản đánh giá chéo mã nguồn và kinh tế của nhóm bạn", "An (Contract)"),
        15: ("URL DApp công khai & Bảo vệ", "Web DApp hoàn chỉnh chạy trên Vercel/GitHub Pages, slide thuyết trình", "Mai (Frontend)")
    }

    for num in range(8, 16):
        status = check_lab_status(num)
        task_name, deliverable, role = milestones_info[num]
        lines.append(f"| **Lab {num}** | {task_name} | {deliverable} | {role} | {status} |")

    new_section = "\n".join(lines)

    pattern = re.compile(
        r"## 3\. Mốc tiến độ bắt buộc \(Milestones\).*?(?=\n---|\Z)",
        re.DOTALL
    )

    if pattern.search(content):
        updated_content = pattern.sub(new_section + "\n", content)
        plan_path.write_text(updated_content, encoding="utf-8")
        print("[THANH CONG] Da cap nhat tien trinh vao docs/PROJECT_PLAN.md")

if __name__ == "__main__":
    print("===================================================")
    print("DANG KIEM TRA VA DONG BO TIEN TRINH LAB 8 - LAB 15")
    print("===================================================")
    for lab_idx in range(8, 16):
        st = check_lab_status(lab_idx)
        print(f"  * Lab {lab_idx}: {st}")
    print("---------------------------------------------------")
    update_readme()
    update_project_plan()
    print("===================================================")
