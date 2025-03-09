
class Weapon {
    constructor(game) {
        this.bullets = [];
        this.fireRate = 300; // 300
        this.lastShot = 0;
        this.bulletSpeed = 10;
        this.bulletImage = game ? game.assets.bullet : null;
        this.game = game;
        this.weaponLevel = 1;
        this.bulletType = 'normal';
        this.bulletDamage = 25;
        this.spreadCount = 1;
        this.effectImages = game && game.effectImages ? game.effectImages : [];
        
        // Đảm bảo game có assets trước khi sử dụng
        if (game && game.assets) {
            this.bulletImages = {
                normal: game.assets.bullet, // noiamanhkinhhoangv1.png
                spread: this.getImageByName('noiamanhkinhhoangv2.png'),
                explosive: this.getImageByName('booklua.jpg'),
                homing: this.getImageByName('hiamanhkinhhoang.png'),
                piercing: this.getImageByName('booksmilev2.png')
            };
            
            // Thêm các ảnh hiệu ứng từ game
            if (game.effectImages && game.effectImages.length > 0) {
                this.effectImages = game.effectImages;
            }
        }
    }
    
    getImageByName(imageName) {
        if (!this.game || !this.game.assets || !this.game.assets.enemies) {
            return null;
        }
        
        // Tìm hình ảnh trong danh sách assets
        for (const enemyImg of this.game.assets.enemies) {
            if (enemyImg.src.includes(imageName)) {
                return enemyImg;
            }
        }
        
        return this.game.assets.bullet; // Trả về hình ảnh mặc định nếu không tìm thấy
    }

    upgradeWeapon() {
        this.weaponLevel++;

        // Nâng cấp vũ khí dựa trên level
        switch (this.weaponLevel) {
            case 2:
                this.bulletType = 'spread';
                this.spreadCount = 2;
                this.bulletDamage = 30;
                this.fireRate = 280; //280
                break;
            case 3:
                this.bulletType = 'explosive';
                this.spreadCount = 1;
                this.bulletDamage = 40;
                this.fireRate = 350;
                break;
            case 4:
                this.bulletType = 'homing';
                this.spreadCount = 1;
                this.bulletDamage = 35;
                this.fireRate = 250;
                break;
            case 5:
                this.bulletType = 'piercing';
                this.spreadCount = 2;
                this.bulletDamage = 50;
                this.fireRate = 200;
                break;
            default:
                // Nếu level > 5, tăng sát thương và giảm tốc độ bắn
                this.bulletDamage += 10;
                this.fireRate = Math.max(150, this.fireRate - 10);
                if (this.weaponLevel % 2 === 0) {
                    this.spreadCount = Math.min(5, this.spreadCount + 1);
                }
                break;
        }
    }

    shoot(x, y, angle) {
        const now = Date.now();
        if (now - this.lastShot >= this.fireRate) {
            const bulletImage = this.bulletImages ? this.bulletImages[this.bulletType] || this.bulletImage : this.bulletImage;
            
            switch (this.bulletType) {
                case 'normal':
                    // Đạn thường chỉ dùng hình ảnh cố định
                    const normalBullet = new Bullet(x, y, angle, this.bulletSpeed, this.bulletType, this.bulletDamage, bulletImage);
                    this.bullets.push(normalBullet);
                    break;
                case 'spread':
                    // Bắn đạn rải với hình ảnh cố định
                    const spreadAngle = Math.PI / 12; // 15 độ
                    for (let i = 0; i < this.spreadCount; i++) {
                        const newAngle = angle + spreadAngle * (i - (this.spreadCount - 1) / 2);
                        const spreadBullet = new Bullet(x, y, newAngle, this.bulletSpeed, this.bulletType, this.bulletDamage, bulletImage);
                        spreadBullet.color = `hsl(${(i * 360 / this.spreadCount) % 360}, 100%, 50%)`;
                        this.bullets.push(spreadBullet);
                    }
                    break;
                case 'explosive':
                    // Đạn nổ có thể sử dụng hiệu ứng từ assets cho vụ nổ
                    const explosiveBullet = new Bullet(x, y, angle, this.bulletSpeed * 0.8, this.bulletType, this.bulletDamage, bulletImage);
                    explosiveBullet.radius = 8; // Đạn lớn hơn
                    // Thêm hiệu ứng nổ từ assets
                    explosiveBullet.explosionEffectImages = this.effectImages;
                    this.bullets.push(explosiveBullet);
                    break;
                case 'homing':
                    // Đạn tự động ngắm chỉ dùng hình ảnh cố định
                    const homingBullet = new Bullet(x, y, angle, this.bulletSpeed * 0.7, this.bulletType, this.bulletDamage, bulletImage);
                    this.bullets.push(homingBullet);
                    break;
                case 'piercing':
                    // Bắn đạn xuyên với hiệu ứng trail
                    const spreadAngle2 = Math.PI / 10; // 18 độ
                    for (let i = 0; i < this.spreadCount; i++) {
                        const newAngle = angle + spreadAngle2 * (i - (this.spreadCount - 1) / 2);
                        const piercingBullet = new Bullet(x, y, newAngle, this.bulletSpeed * 1.2, this.bulletType, this.bulletDamage, bulletImage);
                        piercingBullet.trailEffect = true; // Thêm hiệu ứng trail
                        this.bullets.push(piercingBullet);
                    }
                    break;
            }
            this.lastShot = now;
        }
    }

    update(canvasWidth, canvasHeight) {
        let childBullets = [];
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();

            // Đạn nổ sẽ xử lý đặc biệt khi chạm vào kẻ địch
            if (bullet.type === 'explosive' && !bullet.isExploding && !bullet.active) {
                bullet.explode();
                bullet.active = true;
                return true;
            }

            // Đạn nổ đang nổ sẽ tiếp tục hiển thị cho đến khi nổ xong
            if (bullet.isExploding) {
                return bullet.active;
            }
            
            // Thu thập đạn con
            if (bullet.childBullets && bullet.childBullets.length > 0) {
                childBullets = childBullets.concat(bullet.childBullets);
                bullet.childBullets = [];
            }

            // Đạn thường sẽ bị xóa khi ra khỏi màn hình
            return bullet.active &&
                   bullet.x >= 0 &&
                   bullet.x <= canvasWidth &&
                   bullet.y >= 0 &&
                   bullet.y <= canvasHeight;
        });

        // Giới hạn số lượng đạn để tránh lag
        const maxBullets = 200;
        if (this.bullets.length + childBullets.length > maxBullets) {
            const keepCount = Math.max(0, maxBullets - childBullets.length);
            this.bullets = this.bullets.slice(-keepCount);
        }
        
        // Thêm đạn con vào danh sách đạn chính
        if (childBullets.length > 0) {
            this.bullets = this.bullets.concat(childBullets);
        }
    }

    draw(ctx) {
        this.bullets.forEach(bullet => bullet.draw(ctx));
    }
}

class Bullet {
    constructor(x, y, angle, speed, type = 'normal', damage = 25, image = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = 5;
        this.active = true;
        this.type = type;
        this.damage = damage;
        this.image = image;
        this.effectImage = null; // Hình ảnh hiệu ứng từ assets
        this.width = 20;
        this.height = 20;
        this.isExploding = false;
        this.explosionRadius = 0;
        this.maxExplosionRadius = 60;
        this.explosionTimer = 0;
        this.explosionSpeed = 3;
        this.childBullets = [];
        this.color = '#ffff00'; // Màu mặc định
        this.rotationSpeed = (Math.random() * 0.1) - 0.05; // Tốc độ xoay ngẫu nhiên
        this.rotation = 0;
        this.trailEffect = false;
        this.trailPoints = [];
        this.explosionEffectImages = null;
        this.pulseAmount = 1 + Math.random() * 0.2; // Hiệu ứng nhấp nháy
        
        // Thiết lập đặc tính dựa trên loại đạn
        switch(type) {
            case 'explosive':
                this.color = '#ff4500';
                break;
            case 'spread':
                this.color = '#add8e6';
                break;
            case 'homing':
                this.color = '#9932cc';
                break;
            case 'piercing':
                this.color = '#32cd32';
                this.width = 25;
                this.height = 25;
                this.trailEffect = true;
                break;
        }
    }

    update() {
        if (!this.active) return;
        
        if (this.isExploding) {
            this.updateExplosion();
            return;
        }
        
        // Cập nhật góc xoay
        this.rotation += this.rotationSpeed;
        
        // Lưu vị trí hiện tại cho hiệu ứng trail nếu có
        if (this.trailEffect) {
            this.trailPoints.push({x: this.x, y: this.y, alpha: 1.0});
            // Giới hạn số điểm trail để không làm chậm game
            if (this.trailPoints.length > 10) {
                this.trailPoints.shift();
            }
        }
        
        // Xử lý đạn đặc biệt
        if (this.type === 'homing') {
            this.updateHomingBullet();
        } else {
            // Đạn thường di chuyển thẳng
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
        
        // Cập nhật alpha cho các điểm trail
        if (this.trailPoints.length > 0) {
            for (let i = 0; i < this.trailPoints.length; i++) {
                this.trailPoints[i].alpha -= 0.1;
                if (this.trailPoints[i].alpha < 0) {
                    this.trailPoints[i].alpha = 0;
                }
            }
        }
    }
    
    updateHomingBullet() {
        // Tìm kẻ địch gần nhất để đuổi theo
        const game = window.game;
        if (!game) {
            // Nếu không có game, đạn di chuyển thẳng
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            return;
        }
        
        // Tìm kẻ địch gần nhất (kể cả boss)
        let closestTarget = null;
        let minDistance = Infinity;
        
        // Thêm các kẻ địch thường vào danh sách mục tiêu
        let targets = [];
        if (game.enemies && game.enemies.length > 0) {
            targets = [...game.enemies.filter(enemy => enemy.active)];
        }
        
        // Thêm boss vào danh sách mục tiêu
        if (game.boss && game.boss.active) {
            targets.push(game.boss);
        }
        
        if (targets.length === 0) {
            // Không có mục tiêu, đạn di chuyển thẳng
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            return;
        }
        
        // Tìm kẻ địch gần nhất
        targets.forEach(target => {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestTarget = target;
            }
        });
        
        if (closestTarget) {
            // Tính góc mới để đuổi theo kẻ địch
            const targetAngle = Math.atan2(
                closestTarget.y - this.y,
                closestTarget.x - this.x
            );
            
            // Điều chỉnh góc hiện tại để đạn dần dần quay về hướng kẻ địch
            const angleAdjustment = 0.1; // Điều chỉnh tốc độ quay của đạn
            this.angle = this.angle + angleAdjustment * Math.sin(targetAngle - this.angle);
        }
        
        // Di chuyển đạn theo góc mới
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    updateExplosion() {
        this.explosionTimer++;
        this.explosionRadius = Math.min(this.maxExplosionRadius, this.explosionRadius + this.explosionSpeed);
        
        // Kết thúc nổ
        if (this.explosionTimer > 30) {
            this.active = false;
            return;
        }
        
        // Phá hủy chướng ngại vật trong phạm vi nổ
        if (this.explosionTimer === 1) {
            this.destroyNearbyObstacles();
        }
        
        // Tạo đạn con khi nổ (chỉ tạo một lần) với hình ảnh từ assets
        if (this.explosionTimer === 5) {
            const fragmentCount = 8;
            const angleStep = (Math.PI * 2) / fragmentCount;
            
            for (let i = 0; i < fragmentCount; i++) {
                const fragmentAngle = i * angleStep;
                const fragment = new Bullet(
                    this.x, 
                    this.y, 
                    fragmentAngle, 
                    5, 
                    'normal', 
                    this.damage / 2
                );
                
                // Sử dụng hình ảnh từ explosionEffectImages nếu có
                if (this.explosionEffectImages && this.explosionEffectImages.length > 0) {
                    const randomIndex = Math.floor(Math.random() * this.explosionEffectImages.length);
                    fragment.effectImage = this.explosionEffectImages[randomIndex];
                }
                
                fragment.radius = 3;
                this.childBullets.push(fragment);
            }
        }
    }
    
    // Phá hủy chướng ngại vật trong phạm vi nổ
    destroyNearbyObstacles() {
        const game = window.game;
        if (!game || !game.obstacles) return;
        
        const explosionRange = this.maxExplosionRadius * 0.8; // Phạm vi phá hủy
        
        // Kiểm tra và phá hủy các chướng ngại vật trong phạm vi nổ
        for (let i = game.obstacles.length - 1; i >= 0; i--) {
            const obstacle = game.obstacles[i];
            
            // Tính khoảng cách từ tâm vụ nổ đến tâm chướng ngại vật
            const dx = this.x - (obstacle.x + obstacle.size/2);
            const dy = this.y - (obstacle.y + obstacle.size/2);
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // Nếu chướng ngại vật nằm trong phạm vi nổ
            if (distance <= explosionRange + obstacle.size/2) {
                // Xóa chướng ngại vật khỏi danh sách
                game.obstacles.splice(i, 1);
                
                // Thêm điểm khi phá hủy chướng ngại vật
                game.score += 10;
                
                // Tạo hiệu ứng nổ tạm thời tại vị trí chướng ngại vật
                if (this.explosionEffectImages && this.explosionEffectImages.length > 0) {
                    const randomIndex = Math.floor(Math.random() * this.explosionEffectImages.length);
                    const explosionImage = this.explosionEffectImages[randomIndex];
                    
                    // Thêm hiệu ứng nổ tại vị trí chướng ngại vật
                    const explosion = {
                        x: obstacle.x + obstacle.size/2,
                        y: obstacle.y + obstacle.size/2,
                        radius: obstacle.size,
                        timer: 0,
                        maxTime: 20,
                        image: explosionImage
                    };
                    
                    // Thêm vào mảng hiệu ứng nếu có
                    if (!game.effects) {
                        game.effects = [];
                    }
                    game.effects.push(explosion);
                }
            }
        }
    }

    explode() {
        this.isExploding = true;
        this.explosionRadius = 10;
        this.explosionTimer = 0;
    }

    draw(ctx) {
        if (!this.active) return;
        
        // Vẽ trail cho đạn xuyên
        if (this.trailEffect && this.trailPoints.length > 0) {
            // Vẽ trail bằng đường thẳng với độ trong suốt giảm dần
            ctx.save();
            ctx.lineWidth = 3;
            
            for (let i = 0; i < this.trailPoints.length - 1; i++) {
                // Tạo gradient cho trail
                const gradient = ctx.createLinearGradient(
                    this.trailPoints[i].x, this.trailPoints[i].y,
                    this.trailPoints[i+1].x, this.trailPoints[i+1].y
                );
                gradient.addColorStop(0, `rgba(${this.getColorValues(this.color)}, ${this.trailPoints[i].alpha * 0.7})`);
                gradient.addColorStop(1, `rgba(${this.getColorValues(this.color)}, ${this.trailPoints[i+1].alpha * 0.7})`);
                
                ctx.strokeStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(this.trailPoints[i].x, this.trailPoints[i].y);
                ctx.lineTo(this.trailPoints[i+1].x, this.trailPoints[i+1].y);
                ctx.stroke();
            }
            ctx.restore();
        }
        
        if (this.isExploding) {
            // Vẽ hiệu ứng nổ với ảnh từ assets
            if (this.explosionEffectImages && this.explosionEffectImages.length > 0) {
                const explosionSize = this.explosionRadius * 2;
                const fade = 1 - this.explosionTimer / 30;
                
                ctx.save();
                ctx.globalAlpha = fade;
                
                // Chọn một ảnh từ assets làm hiệu ứng nổ dựa vào thời gian
                const index = Math.floor(this.explosionTimer / 5) % this.explosionEffectImages.length;
                const explosionImage = this.explosionEffectImages[index];
                
                // Xoay ảnh nổ nhẹ để tạo hiệu ứng
                ctx.translate(this.x, this.y);
                ctx.rotate(this.explosionTimer * 0.1);
                ctx.drawImage(
                    explosionImage,
                    -explosionSize/2,
                    -explosionSize/2,
                    explosionSize,
                    explosionSize
                );
                
                // Vẽ thêm một lớp ánh sáng bên dưới
                ctx.globalAlpha = fade * 0.5;
                ctx.beginPath();
                ctx.arc(0, 0, this.explosionRadius * 1.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 50, 0.8)`;
                ctx.fill();
                
                ctx.restore();
            } else {
                // Vẽ hiệu ứng nổ mặc định nếu không có ảnh
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 87, 34, ${1 - this.explosionTimer / 30})`;
                ctx.fill();
            }
            return;
        }
        
        // Hiệu ứng nhấp nháy kích thước cho đạn
        const pulseSize = 1 + Math.sin(Date.now() * 0.01) * 0.1 * this.pulseAmount;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + this.rotation);
        
        // Ưu tiên vẽ hình ảnh đạn nếu có
        if (this.image) {
            // Vẽ hình ảnh đạn từ assets (như noiamanhkinhhoang, bookbichocan)
            ctx.drawImage(
                this.image,
                -this.width * pulseSize / 2,
                -this.height * pulseSize / 2,
                this.width * pulseSize,
                this.height * pulseSize
            );
            
            // Chỉ thêm hiệu ứng phát sáng cho đạn đặc biệt
            if (this.type === 'homing' || this.type === 'piercing') {
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 1.8, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        } 
        // Chỉ vẽ hiệu ứng đặc biệt cho vụ nổ
        else if (this.effectImage && (this.type === 'explosive' || this.childBullets.length > 0)) {
            ctx.drawImage(
                this.effectImage,
                -this.width * pulseSize / 2,
                -this.height * pulseSize / 2,
                this.width * pulseSize,
                this.height * pulseSize
            );
        } 
        // Vẽ đạn mặc định nếu không có hình ảnh
        else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * pulseSize, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Hàm hỗ trợ chuyển đổi màu HEX/tên màu sang định dạng RGB
    getColorValues(color) {
        // Xử lý các màu đặt tên
        const namedColors = {
            'red': '255,0,0',
            'green': '0,128,0',
            'blue': '0,0,255',
            'yellow': '255,255,0',
            'orange': '255,165,0',
            'purple': '128,0,128',
            'pink': '255,192,203',
            'black': '0,0,0',
            'white': '255,255,255',
            '#ff4500': '255,69,0',
            '#add8e6': '173,216,230',
            '#9932cc': '153,50,204',
            '#32cd32': '50,205,50',
            '#ffff00': '255,255,0'
        };
        
        if (namedColors[color]) {
            return namedColors[color];
        }
        
        // Default fallback
        return '255,255,255';
    }
}
