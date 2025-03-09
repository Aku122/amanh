class Player {
    constructor(x, y, playerImage, game) {
        this.x = x;
        this.y = y;
        this.baseRadius = 30; // Tăng base radius từ 25 lên 30
        this.baseSpeed = 3;   // Base speed
        this.weapon = new Weapon(game);
        this.angle = 0;
        this.image = playerImage;
        this.baseWidth = 60;  // Tăng base width từ 50 lên 60
        this.baseHeight = 60; // Tăng base height từ 50 lên 60
        this.health = 100;
        this.isAlive = true;
        this.game = game; // Store reference to game
        
        // Khởi tạo với giá trị mặc định
        this.radius = this.baseRadius;
        this.width = this.baseWidth;
        this.height = this.baseHeight;
        this.speed = this.baseSpeed;
        
        // Áp dụng tỉ lệ nếu có
        if (game && game.scaleFactor) {
            this.applyScaling(game.scaleFactor);
        }
    }
    
    // Thêm phương thức mới để áp dụng tỉ lệ
    applyScaling(scaleFactor) {
        // Không thay đổi vị trí x, y vì chúng sẽ được tính toán dựa trên canvas
        // Áp dụng tỉ lệ cho các thuộc tính khác
        this.radius = this.baseRadius * scaleFactor;
        this.speed = this.baseSpeed * scaleFactor;
        this.width = this.baseWidth * scaleFactor;
        this.height = this.baseHeight * scaleFactor;
    }

    update(controls, canvas, game) { 
        if (!this.isAlive) return;

        // Movement
        let moveX = 0;
        let moveY = 0;

        // Xử lý di chuyển dựa trên phím
        if (controls.keys.up) moveY -= this.speed;
        if (controls.keys.down) moveY += this.speed;
        if (controls.keys.left) moveX -= this.speed;
        if (controls.keys.right) moveX += this.speed;

        // Di chuyển người chơi - Using the new move function
        this.move(moveX, moveY, canvas, game);

        // Cập nhật góc nhìn của người chơi trước khi bắn
        this.updatePlayerAngle(controls);

        // Luôn tự động nhắm và bắn khi có kẻ địch
        const closestEnemy = this.findClosestEnemy(game);
        if (closestEnemy) {
            // Tự động bắn khi có kẻ địch
            this.weapon.shoot(this.x, this.y, this.angle);
        }

        this.weapon.update(canvas.width, canvas.height);
    }

    move(dx, dy, canvas, game) {
        const speed = this.speed;
        const newX = this.x + dx;
        const newY = this.y + dy;

        // Keep player within canvas bounds
        const validX = newX >= this.radius && newX <= canvas.width - this.radius;
        const validY = newY >= this.radius && newY <= canvas.height - this.radius;

        // Check obstacle collision
        const obstacleCollision = game && game.checkObstacleCollision ? 
            game.checkObstacleCollision(newX, this.y, this.radius) : false;

        // Move on X axis if valid and no obstacle
        if (validX && !obstacleCollision) {
            this.x = newX;
        }

        // Check obstacle collision for Y movement separately
        const obstacleCollisionY = game && game.checkObstacleCollision ? 
            game.checkObstacleCollision(this.x, newY, this.radius) : false;

        // Move on Y axis if valid and no obstacle
        if (validY && !obstacleCollisionY) {
            this.y = newY;
        }
    }

    updatePlayerAngle(controls) {
        // Luôn tự động nhắm vào kẻ địch gần nhất
        const closestEnemy = this.findClosestEnemy(this.game);
        if (closestEnemy) {
            // Tính góc để nhắm vào kẻ địch gần nhất
            this.angle = Math.atan2(
                closestEnemy.y - this.y,
                closestEnemy.x - this.x
            );
            return;
        }

        // Nếu không có kẻ địch, duy trì góc hiện tại
        // hoặc có thể đặt hướng mặc định theo hướng di chuyển
        if (controls.keys.up || controls.keys.down || controls.keys.left || controls.keys.right) {
            let dx = 0;
            let dy = 0;

            if (controls.keys.right) dx += 1;
            if (controls.keys.left) dx -= 1;
            if (controls.keys.down) dy += 1;
            if (controls.keys.up) dy -= 1;

            if (dx !== 0 || dy !== 0) {
                this.angle = Math.atan2(dy, dx);
            }
        }
    }

    findClosestEnemy(game) {
        if (!game) {
            return null;
        }

        let targets = [];

        // Thêm các kẻ địch thường vào danh sách mục tiêu
        if (game.enemies && game.enemies.length > 0) {
            targets = [...game.enemies.filter(enemy => enemy.active)];
        }

        // Thêm boss vào danh sách mục tiêu (ưu tiên boss)
        if (game.boss && game.boss.active) {
            targets.push(game.boss);
        }

        if (targets.length === 0) {
            return null;
        }

        let closestEnemy = null;
        let minDistance = Infinity;

        // Tìm kẻ địch gần nhất (ưu tiên boss)
        targets.forEach(target => {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Ưu tiên boss hơn (giảm khoảng cách để boss luôn được chọn nếu nó xuất hiện)
            const adjustedDistance = target === game.boss ? distance * 0.5 : distance;

            if (adjustedDistance < minDistance) {
                minDistance = adjustedDistance;
                closestEnemy = target;
            }
        });

        return closestEnemy;
    }

    draw(ctx) {
        if (!this.isAlive) return;

        // Lấy scale factor từ game nếu có
        const scaleFactor = this.game && this.game.scaleFactor ? this.game.scaleFactor : 1;
        const scaledWidth = this.width * scaleFactor;
        const scaledHeight = this.height * scaleFactor;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw player image with scale factor
        ctx.drawImage(
            this.image,
            -scaledWidth/2,
            -scaledHeight/2,
            scaledWidth,
            scaledHeight
        );

        ctx.restore();

        // Draw health bar
        const healthBarWidth = 50;
        const healthBarHeight = 5;
        const healthPercent = this.health / 100;

        // Health bar background (red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            this.x - healthBarWidth/2,
            this.y - this.height/2 - 15,
            healthBarWidth,
            healthBarHeight
        );

        // Health bar foreground (green)
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(
            this.x - healthBarWidth/2,
            this.y - this.height/2 - 15,
            healthBarWidth * healthPercent,
            healthBarHeight
        );

        // Draw weapon bullets
        this.weapon.draw(ctx);
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;

            // Tạo hiệu ứng khi người chơi chết
            this.createDeathEffect();

            return true; // Player died
        }
        return false;
    }

    // Tạo hiệu ứng khi người chơi chết
    createDeathEffect() {
        // Tạo các mảnh vỡ nhỏ từ hình ảnh người chơi
        const numFragments = 8;
        const fragmentSize = this.width / 2;

        for (let i = 0; i < numFragments; i++) {
            // Tính toán hướng bay ra của mỗi mảnh vỡ
            const angle = (i / numFragments) * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            const rotation = Math.random() * 360;

            // Tạo một div mới để hiển thị mảnh vỡ
            const fragment = document.createElement('div');
            fragment.className = 'death-fragment';
            fragment.style.width = `${fragmentSize}px`;
            fragment.style.height = `${fragmentSize}px`;
            fragment.style.backgroundImage = `url(${this.image.src})`;
            fragment.style.backgroundSize = 'cover';
            fragment.style.left = `${this.x}px`;
            fragment.style.top = `${this.y}px`;
            fragment.style.setProperty('--tx', `${tx}px`);
            fragment.style.setProperty('--ty', `${ty}px`);
            fragment.style.setProperty('--r', `${rotation}deg`);

            // Thêm mảnh vỡ vào body
            document.body.appendChild(fragment);

            // Xóa mảnh vỡ sau khi animation kết thúc
            setTimeout(() => {
                if (fragment.parentNode) {
                    fragment.parentNode.removeChild(fragment);
                }
            }, 2000);
        }
    }

    heal(amount) {
        this.health = Math.min(100, this.health + amount);
    }

    upgradeWeapon() {
        this.weapon.upgradeWeapon();
    }

    getWeaponInfo() {
        const weaponNames = {
            'normal': 'Đạn thường',
            'spread': 'Đạn rải',
            'explosive': 'Đạn nổ',
            'homing': 'Đạn tự động ngắm',
            'piercing': 'Đạn xuyên'
        };

        return {
            name: weaponNames[this.weapon.bulletType],
            level: this.weapon.weaponLevel,
            damage: this.weapon.bulletDamage
        };
    }
}

// Weapon class is now imported from weapons.js

// ... rest of the game code (Enemy, Boss, etc.)  This needs significant expansion to include a larger map, random obstacles, etc.