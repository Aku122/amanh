class BossBullet {
    constructor(x, y, angle, speed, damage, type = 'normal', bossImage = null, effectImages = null) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.speed = speed;
        this.angle = angle;
        this.active = true;
        this.damage = damage;
        this.type = type;
        this.color = '#ff5500';
        this.image = bossImage; // Hình ảnh boss thu nhỏ
        this.effectImages = effectImages;
        this.childBullets = [];
        this.explosionTimer = 0;
        this.beamWidth = 0; // Độ rộng của tia laser
        this.beamLength = 0; // Chiều dài của tia laser
        this.beamGrowth = 15; // Tốc độ tăng chiều dài tia laser
        this.lifespan = 120; // Tuổi thọ tối đa của đạn (2 giây ở 60fps)
        this.age = 0; // Tuổi hiện tại
        this.rotationSpeed = (Math.random() * 0.1) - 0.05; // Tốc độ xoay ngẫu nhiên
        this.pulseAmount = Math.random() * 0.2 + 0.9; // Hiệu ứng nhấp nháy

        // Chọn hình ảnh hiệu ứng ngẫu nhiên nếu có
        if (effectImages && effectImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * effectImages.length);
            this.effectImage = effectImages[randomIndex];
        }
    }

    update() {
        if (!this.active) return;

        // Tăng tuổi của đạn và kiểm tra tuổi thọ
        this.age++;
        if (this.age > this.lifespan) {
            this.active = false;
            return;
        }

        switch(this.type) {
            case 'normal':
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                break;

            case 'explosion':
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                this.explosionTimer++;
                if (this.explosionTimer > 60) { // Nổ sau 1 giây
                    this.explode();
                }
                break;

            case 'beam':
                // Tia laser sẽ kéo dài từ nguồn
                this.beamLength += this.beamGrowth;
                break;

            case 'homing':
                // Tìm player để điều chỉnh góc
                const game = window.game;
                if (game && game.player && game.player.isAlive) {
                    const dx = game.player.x - this.x;
                    const dy = game.player.y - this.y;
                    const targetAngle = Math.atan2(dy, dx);

                    // Điều chỉnh góc từ từ
                    const angleDiff = targetAngle - this.angle;
                    this.angle += angleDiff * 0.02; // Điều chỉnh từ từ
                }

                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                break;
        }

        // Cập nhật các đạn con (giới hạn số lượng đạn con để tối ưu hiệu năng)
        if (this.childBullets.length > 0) {
            this.childBullets = this.childBullets.filter(bullet => {
                bullet.update();
                return bullet.active;
            });
        }
    }

    explode() {
        this.active = false;

        // Giới hạn số lượng đạn con để tối ưu hiệu suất
        const maxChildren = 6;
        for (let i = 0; i < maxChildren; i++) {
            const angle = i * (Math.PI * 2 / maxChildren);
            const childBullet = new BossBullet(this.x, this.y, angle, this.speed * 0.8, this.damage * 0.5);
            childBullet.lifespan = 60; // Tuổi thọ ngắn hơn cho đạn con
            this.childBullets.push(childBullet);
        }
    }

    draw(ctx) {
        if (!this.active) {
            // Vẽ đạn con nếu có
            this.childBullets.forEach(bullet => bullet.draw(ctx));
            return;
        }

        // Thêm hiệu ứng xoay và nhấp nháy kích thước
        const pulseSize = 1 + Math.sin(this.age * 0.1) * this.pulseAmount * 0.2;
        const currentRadius = this.radius * pulseSize;

        switch(this.type) {
            case 'normal':
            case 'explosion':
            case 'homing':
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle + this.age * this.rotationSpeed);

                if (this.effectImage) {
                    // Vẽ hiệu ứng đặc biệt từ assets
                    ctx.drawImage(
                        this.effectImage, 
                        -currentRadius * 1.5, 
                        -currentRadius * 1.5, 
                        currentRadius * 3, 
                        currentRadius * 3
                    );
                } else if (this.image) {
                    // Vẽ hình ảnh boss thu nhỏ
                    ctx.drawImage(
                        this.image, 
                        -currentRadius, 
                        -currentRadius, 
                        currentRadius * 2, 
                        currentRadius * 2
                    );

                    // Thêm hiệu ứng phát sáng xung quanh đạn
                    ctx.globalAlpha = 0.4;
                    ctx.beginPath();
                    ctx.arc(0, 0, currentRadius * 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                } else {
                    // Vẽ đạn tròn mặc định
                    ctx.beginPath();
                    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();
                    ctx.closePath();
                }
                ctx.restore();
                break;

            case 'beam':
                // Vẽ tia laser với hiệu ứng nâng cao
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);

                // Tạo gradient cho tia laser
                const gradient = ctx.createLinearGradient(0, 0, this.beamLength, 0);
                gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 200, 0, 0.3)');

                ctx.fillStyle = gradient;

                // Vẽ tia laser chính
                const pulseWidth = this.beamWidth * (1 + Math.sin(this.age * 0.2) * 0.2);
                ctx.fillRect(0, -pulseWidth/2, this.beamLength, pulseWidth);

                // Thêm viền cho tia laser
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, -pulseWidth/2, this.beamLength, pulseWidth);

                // Thêm hiệu ứng ánh sáng ở đầu tia laser
                if (this.effectImage) {
                    ctx.drawImage(
                        this.effectImage, 
                        this.beamLength - 20, 
                        -20, 
                        40, 
                        40
                    );
                }

                ctx.restore();
                break;
        }

        // Vẽ đạn con nếu có
        this.childBullets.forEach(bullet => bullet.draw(ctx));
    }
}

class Boss {
    constructor(canvasWidth, canvasHeight, bossImage, level = 1, scaleFactor = 1) {
        this.x = canvasWidth / 2;
        this.y = canvasHeight / 3;
        
        // Thuộc tính cơ bản - tăng kích thước boss
        this.baseRadius = 60;    // Tăng từ 50 lên 60
        this.baseWidth = 120;    // Tăng từ 100 lên 120
        this.baseHeight = 120;   // Tăng từ 100 lên 120
        this.baseSpeed = 1.5 + (level - 1) * 0.3;
        
        // Áp dụng tỉ lệ
        this.radius = this.baseRadius * scaleFactor;
        this.width = this.baseWidth * scaleFactor;
        this.height = this.baseHeight * scaleFactor;
        this.speed = this.baseSpeed * scaleFactor;
        
        this.baseHealth = 500;
        this.health = this.baseHealth + (level - 1) * 300;
        this.maxHealth = this.health;
        this.active = true;
        this.image = bossImage;
        this.bullets = [];
        this.lastShot = 0;
        this.fireRate = Math.max(500, 1000 - (level - 1) * 100); // milliseconds between shots
        this.attackPattern = 0;
        this.attackCooldown = 0;
        this.bulletSpeed = (3 + (level - 1) * 0.5) * scaleFactor;
        this.bulletDamage = 10 + (level - 1) * 5;
        this.level = level;
        this.attackPhase = 0;
        this.phaseTimer = 0;
        this.specialAttackTimer = 0;
        this.specialAttackCooldown = 5000;
        this.lastSpecialAttack = 0;
        this.rotationAngle = 0;
        this.rotationSpeed = 0.01;
        this.effectImages = null; // Sẽ được thiết lập từ Game
        this.auraOpacity = 0;
        this.auraDirection = 0.01;
        this.scaleFactor = scaleFactor;
    }

    update(playerX, playerY, canvas) {
        if (!this.active) return;

        const now = Date.now();

        // Di chuyển theo kiểu khác nhau tùy vào level boss
        switch(this.level % 5) {
            case 1: // Boss 1 - Di chuyển giữ khoảng cách
                this.updateMovementBasic(playerX, playerY, canvas);
                break;
            case 2: // Boss 2 - Di chuyển nhanh hơn và đột ngột
                this.updateMovementErratic(playerX, playerY, canvas);
                break;
            case 3: // Boss 3 - Di chuyển theo hình tròn quanh player
                this.updateMovementCircular(playerX, playerY, canvas);
                break;
            case 4: // Boss 4 - Di chuyển ẩn hiện
                this.updateMovementTeleport(playerX, playerY, canvas);
                break;
            case 0: // Boss 5 - Kết hợp nhiều kiểu di chuyển
                this.updateMovementCombined(playerX, playerY, canvas);
                break;
        }

        // Phát triển các pha tấn công theo thời gian
        this.phaseTimer++;
        if (this.phaseTimer > 600) { // Mỗi 10 giây
            this.phaseTimer = 0;
            this.attackPhase = (this.attackPhase + 1) % 3;
        }

        // Tấn công thông thường
        if (now - this.lastShot >= this.fireRate) {
            switch(this.level % 5) {
                case 1: // Boss 1 - Tấn công cơ bản
                    switch(this.attackPhase) {
                        case 0: this.shootAtPlayer(playerX, playerY); break;
                        case 1: this.shootSpread(playerX, playerY, 3); break;
                        case 2: this.shootCircle(6); break;
                    }
                    break;
                case 2: // Boss 2 - Thêm đạn nổ
                    switch(this.attackPhase) {
                        case 0: this.shootAtPlayer(playerX, playerY, 'explosion'); break;
                        case 1: this.shootSpread(playerX, playerY, 3); break;
                        case 2: this.shootCircle(8); break;
                    }
                    break;
                case 3: // Boss 3 - Thêm đạn theo dõi
                    switch(this.attackPhase) {
                        case 0: this.shootAtPlayer(playerX, playerY, 'homing'); break;
                        case 1: this.shootSpread(playerX, playerY, 5); break;
                        case 2: this.shootCircle(10); break;
                    }
                    break;
                case 4: // Boss 4 - Kết hợp nhiều loại đạn
                    switch(this.attackPhase) {
                        case 0: this.shootSpread(playerX, playerY, 3, 'explosion'); break;
                        case 1: this.shootAtPlayer(playerX, playerY, 'homing'); break;
                        case 2: this.shootCircle(12, 'normal'); break;
                    }
                    break;
                case 0: // Boss 5 - Tất cả kỹ năng
                    switch(this.attackPhase) {
                        case 0: this.shootCircle(6, 'explosion'); break;
                        case 1: this.shootSpread(playerX, playerY, 5, 'homing'); break;
                        case 2: 
                            this.shootAtPlayer(playerX, playerY, 'normal'); 
                            this.shootCircle(8);
                            break;
                    }
                    break;
            }
            this.lastShot = now;
        }

        // Tấn công đặc biệt - tùy theo loại boss
        if (now - this.lastSpecialAttack >= this.specialAttackCooldown) {
            switch(this.level % 5) {
                case 2: // Boss 2 - Bom mega
                    this.specialAttackMegaBomb(playerX, playerY);
                    break;
                case 3: // Boss 3 - Tia laser
                    this.specialAttackLaser(playerX, playerY);
                    break;
                case 4: // Boss 4 - Đạn cầu vồng
                    this.specialAttackRainbow();
                    break;
                case 0: // Boss 5 - Siêu tấn công
                    this.specialAttackUltimate(playerX, playerY);
                    break;
            }
            this.lastSpecialAttack = now;
        }

        // Cập nhật đạn
        let newBullets = [];

        this.bullets = this.bullets.filter(bullet => {
            bullet.update();

            // Lọc đạn nếu ở ngoài canvas hoặc không còn active
            const isActive = bullet.active &&
                   ((bullet.type !== 'beam' && bullet.x >= 0 && bullet.x <= canvas.width && 
                     bullet.y >= 0 && bullet.y <= canvas.height) ||
                    (bullet.type === 'beam' && bullet.beamLength < 1000)); // Giới hạn chiều dài tia laser

            // Thu thập đạn con để thêm vào sau
            if (bullet.childBullets && bullet.childBullets.length > 0) {
                newBullets = newBullets.concat(bullet.childBullets);
                bullet.childBullets = [];
            }

            return isActive;
        });

        // Thêm đạn con vào danh sách đạn chính sau khi đã lọc
        if (newBullets.length > 0) {
            this.bullets = this.bullets.concat(newBullets);
        }
    }

    updateMovementBasic(playerX, playerY, canvas) {
        // Di chuyển cơ bản - giữ khoảng cách
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        if (distToPlayer > 250) {
            // Di chuyển tới gần player nếu quá xa
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        } else if (distToPlayer < 150) {
            // Di chuyển ra xa nếu quá gần
            const angle = Math.atan2(dy, dx);
            this.x -= Math.cos(angle) * this.speed;
            this.y -= Math.sin(angle) * this.speed;
        }

        // Giữ boss trong canvas
        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));
    }

    updateMovementErratic(playerX, playerY, canvas) {
        // Di chuyển đột ngột và nhanh hơn
        if (Math.random() < 0.03) { // 3% cơ hội mỗi khung hình
            const randomAngle = Math.random() * Math.PI * 2;
            this.x += Math.cos(randomAngle) * this.speed * 5;
            this.y += Math.sin(randomAngle) * this.speed * 5;
        } else {
            // Di chuyển bình thường
            this.updateMovementBasic(playerX, playerY, canvas);
        }
    }

    updateMovementCircular(playerX, playerY, canvas) {
        // Di chuyển theo vòng tròn quanh player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        const targetDist = 200; // Khoảng cách mục tiêu

        let angle = Math.atan2(dy, dx);

        if (Math.abs(distToPlayer - targetDist) > 30) {
            // Di chuyển đến gần khoảng cách mục tiêu
            if (distToPlayer > targetDist) {
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            } else {
                this.x -= Math.cos(angle) * this.speed;
                this.y -= Math.sin(angle) * this.speed;
            }
        } else {
            // Di chuyển theo vòng tròn
            angle += Math.PI/2; // Xoay 90 độ
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }

        // Giữ boss trong canvas
        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));
    }

    updateMovementTeleport(playerX, playerY, canvas) {
        // Ẩn hiện ngẫu nhiên trong map
        if (Math.random() < 0.01) { // 1% cơ hội mỗi khung hình
            // Dịch chuyển đến vị trí ngẫu nhiên
            this.x = Math.random() * (canvas.width - this.width) + this.width/2;
            this.y = Math.random() * (canvas.height - this.height) + this.height/2;
        } else {
            // Di chuyển chậm về phía player
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * this.speed * 0.5;
            this.y += Math.sin(angle) * this.speed * 0.5;
        }
    }

    updateMovementCombined(playerX, playerY, canvas) {
        // Kết hợp các kiểu di chuyển
        switch(this.attackPhase) {
            case 0: this.updateMovementBasic(playerX, playerY, canvas); break;
            case 1: this.updateMovementErratic(playerX, playerY, canvas); break;
            case 2: this.updateMovementCircular(playerX, playerY, canvas); break;
        }
    }

    shootAtPlayer(playerX, playerY, bulletType = 'normal') {
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        // Sử dụng hình ảnh thu nhỏ của boss làm đạn và thêm hiệu ứng
        const bullet = new BossBullet(
            this.x, this.y, angle, this.bulletSpeed, this.bulletDamage, 
            bulletType, this.image, this.effectImages
        );
        this.bullets.push(bullet);
    }

    shootSpread(playerX, playerY, count, bulletType = 'normal') {
        const baseAngle = Math.atan2(playerY - this.y, playerX - this.x);
        const angleSpread = Math.PI / 8;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + angleSpread * (i - (count - 1) / 2);

            // Chọn ảnh hiệu ứng ngẫu nhiên nếu có nhiều hơn 1 ảnh
            let effectImagesForBullet = this.effectImages;

            const bullet = new BossBullet(
                this.x, this.y, angle, this.bulletSpeed, this.bulletDamage, 
                bulletType, this.image, effectImagesForBullet
            );
            // Thay đổi màu đạn theo kiểu cầu vồng
            if (this.effectImages && this.effectImages.length > 0) {
                bullet.color = `hsl(${(i * 360 / count) % 360}, 100%, 50%)`;
            }
            this.bullets.push(bullet);
        }
    }

    shootCircle(count, bulletType = 'normal') {
        const angleStep = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;

            // Tạo hiệu ứng đặc biệt cho đạn
            const bulletSpeed = this.bulletSpeed * (1 + Math.sin(i * 0.5) * 0.2);

            const bullet = new BossBullet(
                this.x, this.y, angle, bulletSpeed, this.bulletDamage, 
                bulletType, this.image, this.effectImages
            );

            // Màu sắc thay đổi theo vị trí
            bullet.color = `hsl(${(i * 360 / count) % 360}, 100%, 50%)`;

            this.bullets.push(bullet);
        }
    }

    specialAttackMegaBomb(playerX, playerY) {
        // Tạo bom lớn bắn về phía player
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        const megaBomb = new BossBullet(this.x, this.y, angle, this.bulletSpeed * 0.7, this.bulletDamage * 2, 'explosion', this.image);
        megaBomb.radius = 20; // Bom lớn hơn
        megaBomb.explosionTimer = 0; // Reset timer
        this.bullets.push(megaBomb);
    }

    specialAttackLaser(playerX, playerY) {
        // Bắn tia laser về phía player
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        const laser = new BossBullet(this.x, this.y, angle, 0, this.bulletDamage * 3, 'beam');
        laser.beamWidth = 30;
        this.bullets.push(laser);
    }

    specialAttackRainbow() {
        // Bắn 16 đạn theo hình cầu vồng
        for (let i = 0; i < 16; i++) {
            const angle = i * Math.PI / 8;
            const bullet = new BossBullet(this.x, this.y, angle, this.bulletSpeed * 1.2, this.bulletDamage, 'normal', this.image);
            bullet.color = `hsl(${(i * 360 / 16) % 360}, 100%, 50%)`;
            this.bullets.push(bullet);
        }
    }

    specialAttackUltimate(playerX, playerY) {
        // Kết hợp nhiều loại tấn công
        this.shootCircle(12, 'normal');
        this.specialAttackLaser(playerX, playerY);
        setTimeout(() => {
            if (this.active) {
                this.shootSpread(playerX, playerY, 5, 'explosion');
            }
        }, 1000);
    }

    draw(ctx) {
        if (!this.active) return;

        // Cập nhật hiệu ứng xoay và ánh sáng
        this.rotationAngle += this.rotationSpeed;
        this.auraOpacity += this.auraDirection;
        if (this.auraOpacity >= 0.6) {
            this.auraDirection = -0.005;
        } else if (this.auraOpacity <= 0.2) {
            this.auraDirection = 0.005;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Vẽ hiệu ứng hào quang xung quanh boss
        const auraSize = this.width * 1.5;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraSize);
        gradient.addColorStop(0, `rgba(255, 0, 0, ${this.auraOpacity})`);
        gradient.addColorStop(0.5, `rgba(255, 150, 0, ${this.auraOpacity * 0.6})`);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

        ctx.beginPath();
        ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Vẽ hiệu ứng xoay xung quanh boss
        if (this.effectImages && this.effectImages.length > 0) {
            const orbitRadius = this.width * 0.8;
            const orbitCount = 3;

            for (let i = 0; i < orbitCount; i++) {
                const angle = this.rotationAngle + (i * Math.PI * 2 / orbitCount);
                const orbitX = Math.cos(angle) * orbitRadius;
                const orbitY = Math.sin(angle) * orbitRadius;
                const orbitSize = this.width * 0.25;

                // Chọn ảnh hiệu ứng ngẫu nhiên
                const effectImg = this.effectImages[i % this.effectImages.length];
                ctx.globalAlpha = 0.7;
                ctx.drawImage(
                    effectImg,
                    orbitX - orbitSize/2,
                    orbitY - orbitSize/2,
                    orbitSize,
                    orbitSize
                );
                ctx.globalAlpha = 1.0;
            }
        }

        // Draw boss image
        ctx.drawImage(
            this.image,
            -this.width/2,
            -this.height/2,
            this.width,
            this.height
        );

        // Health bar
        const healthBarWidth = this.width * 1.5;
        const healthBarHeight = 10;
        const healthPercent = this.health / this.maxHealth;

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            -healthBarWidth/2,
            -this.height/2 - 20,
            healthBarWidth,
            healthBarHeight
        );

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(
            -healthBarWidth/2,
            -this.height/2 - 20,
            healthBarWidth * healthPercent,
            healthBarHeight
        );

        // Hiển thị level boss
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Boss ${Math.ceil(this.level)}`, 0, -this.height/2 - 30);

        ctx.restore();

        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(ctx));
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.active = false;
            return true; // Boss died
        }
        return false;
    }
}