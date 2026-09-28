# Bằng chứng thử nghiệm — Lab 9

Lưu ảnh chụp màn hình vào cùng thư mục này (`evidence/lab-09/`) với đúng tên file bên dưới. Ảnh sẽ tự hiển thị khi mở file này trong VS Code (Preview) hoặc trên GitHub.

## TimeLockVault (Remix VM)

### 1. deposit() thành công (nạp 1 ETH)
![deposit thanh cong](01-timelock-deposit.png)

### 2. withdraw() bị từ chối khi chưa hết khóa — revert StillLocked
![withdraw bi revert](02-timelock-withdraw-reverted.png)

### 3. withdraw() thành công sau khi hết thời gian khóa
![withdraw thanh cong](03-timelock-withdraw-success.png)

## ProjectCore (bonus — Sepolia hoặc Remix VM)

### 4. mintTicket() thành công
![mint ticket](04-projectcore-mint.png)

### 5. buyTicket() thành công (owner đổi chủ)
![buy ticket](05-projectcore-buy.png)

### 6. buyTicket() lần 2 bị từ chối — revert TicketAlreadySold
![buy ticket revert](06-projectcore-buy-reverted.png)
