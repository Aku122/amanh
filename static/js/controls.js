class Controls {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this.isMobile = 'ontouchstart' in window || window.innerWidth < 768;
        this.mouseX = undefined;
        this.mouseY = undefined;

        // Joystick movement
        this.joystickPos = { x: 50, y: 50 };
        this.moveAngle = 0;
        this.moveActive = false;
        this.moveIntensity = 0;

        // Setup mobile controls regardless of screen size for fullscreen support
        this.setupMobileControls();
        this.setupControls();
    }

    // Thiết lập điều khiển di động cho mọi thiết bị
    setupMobileControls() {
        // Luôn hiển thị nút di chuyển trên mobile
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.style.display = 'flex';
        }
    }

    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse controls for PC (chỉ theo dõi vị trí chuột)
        window.addEventListener('mousemove', (e) => {
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        // Xử lý sự kiện fullscreen change
        document.addEventListener('fullscreenchange', () => {
            // Đảm bảo joystick vẫn hiển thị trong chế độ toàn màn hình
            const mobileControls = document.getElementById('mobileControls');
            if (mobileControls) {
                mobileControls.style.display = 'flex';
            }
        });

        // Mobile controls - chỉ giữ lại joystick di chuyển
        const moveJoystick = document.getElementById('moveJoystick');

        if (moveJoystick) {
            moveJoystick.addEventListener('touchstart', (e) => this.handleMoveJoystickStart(e));
            moveJoystick.addEventListener('touchmove', (e) => this.handleMoveJoystickMove(e));
            moveJoystick.addEventListener('touchend', () => this.handleMoveJoystickEnd());
            moveJoystick.addEventListener('touchcancel', () => this.handleMoveJoystickEnd());
        }

        // Weapon switch button
        const weaponSwitcherButton = document.getElementById('weaponSwitcher');
        if (weaponSwitcherButton) {
            weaponSwitcherButton.addEventListener('click', function() {
                // Lấy thông tin game và người chơi
                if (window.game && window.game.player) {
                    // Lấy danh sách vũ khí đã mở khóa
                    const unlockedWeapons = window.game.player.unlockedWeapons || ['normal'];
                    const currentWeapon = window.game.player.weapon.bulletType;

                    if (unlockedWeapons.length <= 1) {
                        // Hiển thị thông báo nếu chỉ có một loại vũ khí
                        window.game.showWaveMessage("Chưa có vũ khí khác để đổi");
                        return;
                    }

                    // Tìm vũ khí tiếp theo trong danh sách
                    const currentIndex = unlockedWeapons.indexOf(currentWeapon);
                    const nextIndex = (currentIndex + 1) % unlockedWeapons.length;
                    const nextWeapon = unlockedWeapons[nextIndex];

                    // Chuyển đổi sang vũ khí tiếp theo
                    window.game.player.switchWeapon(nextWeapon);
                }
            });
        }
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = true;
        if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = true;
        if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;

        // Phím 1 để chuyển đổi vũ khí (chuyển lần lượt qua các vũ khí đã mở khóa)
        const game = window.game;
        if (game && game.player && !game.gameOver && e.key === '1') {
            // Lấy danh sách vũ khí đã mở khóa
            const unlockedWeapons = game.player.unlockedWeapons || ['normal'];
            const currentWeapon = game.player.weapon.bulletType;
            
            if (unlockedWeapons.length <= 1) {
                // Hiển thị thông báo nếu chỉ có một loại vũ khí
                game.showWaveMessage("Chưa có vũ khí khác để đổi");
                return;
            }
            
            // Tìm vũ khí tiếp theo trong danh sách
            const currentIndex = unlockedWeapons.indexOf(currentWeapon);
            const nextIndex = (currentIndex + 1) % unlockedWeapons.length;
            const nextWeapon = unlockedWeapons[nextIndex];
            
            // Chuyển đổi sang vũ khí tiếp theo
            game.player.switchWeapon(nextWeapon);
        }

        // Hiển thị/Ẩn hướng dẫn khi nhấn phím H
        if (e.key === 'h' || e.key === 'H') {
            const controlsGuide = document.getElementById('controlsGuide');
            if (controlsGuide) {
                const currentDisplay = window.getComputedStyle(controlsGuide).display;
                controlsGuide.style.display = currentDisplay === 'none' ? 'block' : 'none';
            }
        }
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = false;
        if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = false;
        if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
    }

    // Move joystick handlers - kiểu MOBA
    handleMoveJoystickStart(e) {
        e.preventDefault();
        const joystick = document.getElementById('moveJoystick');
        const joystickThumb = joystick.querySelector('.joystick-thumb');
        const joystickRect = joystick.getBoundingClientRect();

        // Lưu vị trí trung tâm
        this.joystickCenterX = joystickRect.left + joystickRect.width / 2;
        this.joystickCenterY = joystickRect.top + joystickRect.height / 2;

        // Xử lý touch bắt đầu
        const touch = e.touches[0];
        this.moveActive = true;

        // Cập nhật vị trí joystick-thumb theo touch
        this.updateJoystickPosition(touch.clientX, touch.clientY, joystickThumb);
    }

    handleMoveJoystickMove(e) {
        e.preventDefault();
        if (!this.moveActive) return;

        const touch = e.touches[0];
        const joystickThumb = document.getElementById('moveJoystick').querySelector('.joystick-thumb');

        // Cập nhật vị trí joystick-thumb và điều khiển nhân vật
        this.updateJoystickPosition(touch.clientX, touch.clientY, joystickThumb);
    }

    handleMoveJoystickEnd() {
        // Reset joystick và điều khiển
        this.keys.up = this.keys.down = this.keys.left = this.keys.right = false;
        this.moveActive = false;
        this.moveIntensity = 0;

        // Đặt lại vị trí joystick-thumb về trung tâm
        const joystickThumb = document.getElementById('moveJoystick').querySelector('.joystick-thumb');
        if (joystickThumb) {
            joystickThumb.style.transform = 'translate(-50%, -50%)';
        }
    }

    // Phương thức mới cho joystick kiểu MOBA
    updateJoystickPosition(touchX, touchY, thumbElement) {
        if (!this.joystickCenterX || !thumbElement) return;

        // Tính khoảng cách từ trung tâm đến điểm chạm
        const dx = touchX - this.joystickCenterX;
        const dy = touchY - this.joystickCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Lấy kích thước của joystick để tính bán kính tối đa
        const joystick = document.getElementById('moveJoystick');
        const joystickRect = joystick.getBoundingClientRect();
        const joystickRadius = joystickRect.width / 2;
        const maxRadius = joystickRadius * 0.7; // 70% bán kính của joystick

        // Giới hạn trong bán kính
        let limitedDistance = Math.min(distance, maxRadius);
        const angle = Math.atan2(dy, dx);

        // Tính toán vị trí mới cho thumb
        const thumbX = limitedDistance * Math.cos(angle);
        const thumbY = limitedDistance * Math.sin(angle);

        // Di chuyển thumb
        thumbElement.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

        // Cập nhật điều khiển
        this.moveAngle = angle;
        this.moveIntensity = limitedDistance / maxRadius;

        const deadzone = 0.15; // Giảm giá trị chết xuống 15% để nhạy hơn
        if (this.moveIntensity > deadzone) {
            // Kiểu MOBA - di chuyển theo hướng joystick
            this.keys.left = dx < -maxRadius * deadzone;
            this.keys.right = dx > maxRadius * deadzone;
            this.keys.up = dy < -maxRadius * deadzone;
            this.keys.down = dy > maxRadius * deadzone;
        } else {
            this.keys.left = this.keys.right = this.keys.up = this.keys.down = false;
        }
    }
}