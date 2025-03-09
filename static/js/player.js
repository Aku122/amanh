class Player {
    constructor(x, y, playerImage, game) {
        this.x = x;
        this.y = y;
        this.baseRadius = 30; // Tăng base radius từ 25 lên 30
        this.baseSpeed = 2.75;   // Base speed
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
        
        // Thêm biến theo dõi thời gian chạm vào chướng ngại vật
        this.obstacleContact = {
            isInContact: false,
            obstacle: null,
            timer: 0,
            breakThreshold: 60 // 60 frames ~ 1 giây để phá vỡ chướng ngại vật
        };
        
        // Danh sách các loại đạn đã mở khóa
        this.unlockedWeapons = ['normal'];
        
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
        if (!dx && !dy) {
            // Nếu đang đứng yên, nhưng vẫn đang va chạm với chướng ngại vật
            if (this.obstacleContact.isInContact && this.obstacleContact.obstacle) {
                this.updateObstacleBreaking(game);
            } else {
                // Reset trạng thái va chạm nếu không di chuyển và không còn va chạm
                this.obstacleContact.isInContact = false;
                this.obstacleContact.obstacle = null;
                this.obstacleContact.timer = 0;
            }
            return; 
        }
        
        const speed = this.speed;
        
        // Kiểm tra từng trục riêng biệt và cho phép di chuyển trượt dọc theo chướng ngại vật
        const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
        const slideBuffer = isMobile ? 5 : 3; // Buffer lớn hơn cho mobile
        
        // Reset trạng thái va chạm trước khi kiểm tra lại
        this.obstacleContact.isInContact = false;
        
        // Di chuyển theo trục X
        if (dx !== 0) {
            const newX = this.x + dx;
            // Kiểm tra biên canvas
            const validX = newX >= this.radius && newX <= canvas.width - this.radius;
            
            if (validX) {
                // Kiểm tra va chạm chướng ngại vật trên trục X
                const obstacleResult = game && game.checkObstacleCollision ? 
                    game.checkObstacleCollisionWithInfo(newX, this.y, this.radius) : {collision: false, obstacle: null};
                
                if (!obstacleResult.collision) {
                    this.x = newX;
                } else {
                    // Ghi nhận va chạm với chướng ngại vật
                    this.handleObstacleContact(obstacleResult.obstacle, game);
                    
                    // Thử di chuyển lên hoặc xuống một chút để trượt dọc theo chướng ngại vật
                    const slideUpY = this.y - slideBuffer;
                    const slideDownY = this.y + slideBuffer;
                    
                    const canSlideUpResult = game.checkObstacleCollisionWithInfo(newX, slideUpY, this.radius);
                    const canSlideDownResult = game.checkObstacleCollisionWithInfo(newX, slideDownY, this.radius);
                    
                    const canSlideUp = !canSlideUpResult.collision && slideUpY >= this.radius;
                    const canSlideDown = !canSlideDownResult.collision && slideDownY <= canvas.height - this.radius;
                    
                    if (canSlideUp) {
                        this.y = slideUpY;
                        this.x = newX;
                        this.obstacleContact.isInContact = false; // Không còn va chạm nếu trượt được
                    } else if (canSlideDown) {
                        this.y = slideDownY;
                        this.x = newX;
                        this.obstacleContact.isInContact = false; // Không còn va chạm nếu trượt được
                    }
                }
            }
        }
        
        // Di chuyển theo trục Y
        if (dy !== 0) {
            const newY = this.y + dy;
            // Kiểm tra biên canvas
            const validY = newY >= this.radius && newY <= canvas.height - this.radius;
            
            if (validY) {
                // Kiểm tra va chạm chướng ngại vật trên trục Y
                const obstacleResult = game && game.checkObstacleCollision ? 
                    game.checkObstacleCollisionWithInfo(this.x, newY, this.radius) : {collision: false, obstacle: null};
                
                if (!obstacleResult.collision) {
                    this.y = newY;
                } else {
                    // Ghi nhận va chạm với chướng ngại vật
                    this.handleObstacleContact(obstacleResult.obstacle, game);
                    
                    // Thử di chuyển sang trái hoặc phải một chút để trượt dọc theo chướng ngại vật
                    const slideLeftX = this.x - slideBuffer;
                    const slideRightX = this.x + slideBuffer;
                    
                    const canSlideLeftResult = game.checkObstacleCollisionWithInfo(slideLeftX, newY, this.radius);
                    const canSlideRightResult = game.checkObstacleCollisionWithInfo(slideRightX, newY, this.radius);
                    
                    const canSlideLeft = !canSlideLeftResult.collision && slideLeftX >= this.radius;
                    const canSlideRight = !canSlideRightResult.collision && slideRightX <= canvas.width - this.radius;
                    
                    if (canSlideLeft) {
                        this.x = slideLeftX;
                        this.y = newY;
                        this.obstacleContact.isInContact = false; // Không còn va chạm nếu trượt được
                    } else if (canSlideRight) {
                        this.x = slideRightX;
                        this.y = newY;
                        this.obstacleContact.isInContact = false; // Không còn va chạm nếu trượt được
                    }
                }
            }
        }
        
        // Cập nhật phá vỡ chướng ngại vật nếu đang va chạm
        if (this.obstacleContact.isInContact) {
            this.updateObstacleBreaking(game);
        }
    }
    
    // Xử lý va chạm với chướng ngại vật
    handleObstacleContact(obstacle, game) {
        this.obstacleContact.isInContact = true;
        this.obstacleContact.obstacle = obstacle;
        
        // Nếu va chạm với chướng ngại vật mới, reset timer
        if (this.obstacleContact.obstacle !== obstacle) {
            this.obstacleContact.timer = 0;
        }
    }
    
    // Cập nhật quá trình phá vỡ chướng ngại vật
    updateObstacleBreaking(game) {
        if (!this.obstacleContact.isInContact || !this.obstacleContact.obstacle) return;
        
        this.obstacleContact.timer++;
        
        // Tạo hiệu ứng chấn động nhẹ khi đang phá vỡ
        if (this.obstacleContact.timer % 5 === 0) {
            // Tạo hiệu ứng rung lắc nhẹ
            const shakeAmount = 2;
            this.x += (Math.random() - 0.5) * shakeAmount;
            this.y += (Math.random() - 0.5) * shakeAmount;
        }
        
        // Hiệu ứng tiến trình phá vỡ
        if (game.drawObstacleBreakingProgress) {
            game.drawObstacleBreakingProgress(this.obstacleContact.obstacle, this.obstacleContact.timer / this.obstacleContact.breakThreshold);
        }
        
        // Khi đã va chạm đủ lâu, phá vỡ chướng ngại vật
        if (this.obstacleContact.timer >= this.obstacleContact.breakThreshold) {
            if (game.destroyObstacle) {
                game.destroyObstacle(this.obstacleContact.obstacle);
                // Thêm điểm khi phá hủy chướng ngại vật
                game.score += 20;
                
                // Thêm hiệu ứng phá hủy
                if (game.createObstacleDestroyEffect) {
                    game.createObstacleDestroyEffect(this.obstacleContact.obstacle);
                }
                
                // Reset trạng thái va chạm
                this.obstacleContact.isInContact = false;
                this.obstacleContact.obstacle = null;
                this.obstacleContact.timer = 0;
            }
        }
    }
    
    // Phương thức mới để chuyển đổi loại đạn
    switchWeapon(weaponType) {
        // Kiểm tra nếu đã mở khóa loại đạn này
        if (this.unlockedWeapons.includes(weaponType)) {
            // Lưu lại thông tin cũ
            const oldBulletDamage = this.weapon.bulletDamage;
            const oldFireRate = this.weapon.fireRate;
            
            // Thiết lập loại đạn mới
            this.weapon.bulletType = weaponType;
            
            // Thiết lập các thông số phù hợp với loại đạn
            switch(weaponType) {
                case 'normal':
                    this.weapon.spreadCount = 1;
                    this.weapon.bulletDamage = 25;
                    this.weapon.fireRate = 300;
                    break;
                case 'spread':
                    this.weapon.spreadCount = 2;
                    this.weapon.bulletDamage = 30;
                    this.weapon.fireRate = 280;
                    break;
                case 'explosive':
                    this.weapon.spreadCount = 1;
                    this.weapon.bulletDamage = 40;
                    this.weapon.fireRate = 350;
                    break;
                case 'homing':
                    this.weapon.spreadCount = 1;
                    this.weapon.bulletDamage = 35;
                    this.weapon.fireRate = 250;
                    break;
                case 'piercing':
                    this.weapon.spreadCount = 2;
                    this.weapon.bulletDamage = 50;
                    this.weapon.fireRate = 200;
                    break;
            }
            
            // Hiển thị thông báo chuyển đổi vũ khí
            if (this.game && this.game.showWeaponChangeMessage) {
                this.game.showWeaponChangeMessage(weaponType);
            }
            
            return true;
        }
        return false;
    }
    
    // Phương thức khi mở khóa vũ khí mới
    unlockWeapon(weaponType) {
        if (!this.unlockedWeapons.includes(weaponType)) {
            this.unlockedWeapons.push(weaponType);
            
            // Tự động chuyển sang vũ khí mới mở khóa
            this.switchWeapon(weaponType);
            
            return true;
        }
        return false;
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
        
        // Mở khóa loại vũ khí mới dựa trên level
        const weaponLevel = this.weapon.weaponLevel;
        
        // Mở khóa vũ khí mới dựa trên level
        if (weaponLevel === 2 && !this.unlockedWeapons.includes('spread')) {
            this.unlockWeapon('spread');
        } else if (weaponLevel === 3 && !this.unlockedWeapons.includes('explosive')) {
            this.unlockWeapon('explosive');
        } else if (weaponLevel === 4 && !this.unlockedWeapons.includes('homing')) {
            this.unlockWeapon('homing');
        } else if (weaponLevel === 5 && !this.unlockedWeapons.includes('piercing')) {
            this.unlockWeapon('piercing');
        }
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