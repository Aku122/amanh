class Game {
    constructor() {
        console.log('Game constructor started');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.scoreElement = document.getElementById('scoreValue');
        this.waveElement = document.getElementById('waveValue');
        this.assetsLoaded = false;
        this.gameOver = false;
        this.assets = {
            player: new Image(),
            bullet: new Image(),
            enemies: [],
            boss: new Image()
        };

        // Wave management
        this.currentWave = 1;
        this.enemiesPerWave = 10;
        this.enemiesKilled = 0;
        this.waveComplete = false;
        this.isBossWave = false;
        this.bossDefeated = false;
        this.waveCooldown = 0;

        // Mảng lưu các hiệu ứng tạm thời
        this.effects = [];

        // Load assets first, then start game
        console.log('Starting to load assets...');
        this.loadAssets().then(() => {
            console.log('Assets loaded successfully, initializing game...');
            this.initGame();
        }).catch(error => {
            console.error('Error loading assets:', error);
        });

        // Màn hình chào mừng
        this.startScreen = document.getElementById('startScreen');
        if (this.startScreen) {
            this.startScreen.style.backgroundImage = 'url("/static/assets/noiamanhkinhhoangv2.png")';
        } else {
            console.error("Không tìm thấy màn hình chào mừng");
        }
        this.startButton = document.getElementById('startButton');


        // Thêm các event listener
        if (this.startButton) {
            this.startButton.addEventListener('click', () => {
                // Ẩn màn hình bắt đầu và hiển thị game
                if (this.startScreen) this.startScreen.style.display = 'none';
                this.initGame();
            });
        } else {
            console.error("Không tìm thấy button start game");
        }

        // Thêm biến theo dõi hiệu ứng game over
        this.gameOverEffectCreated = false;
    }

    initGame() {
        // Resize canvas to full screen
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Thêm xử lý sự kiện toàn màn hình
        document.addEventListener('fullscreenchange', () => this.resizeCanvas());
        document.addEventListener('webkitfullscreenchange', () => this.resizeCanvas());
        document.addEventListener('mozfullscreenchange', () => this.resizeCanvas());
        document.addEventListener('MSFullscreenChange', () => this.resizeCanvas());

        // Show game container and hide start screen
        document.querySelector('.game-wrapper').style.display = 'block';
        document.querySelector('.game-header').style.display = 'block';

        // Create controls before player
        this.controls = new Controls();
        // Make sure Player is defined before using it
        if (typeof Player !== 'undefined') {
            this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this.assets.player, this);

            // Pass effect images to player weapon
            if (this.player && this.player.weapon && this.effectImages) {
                this.player.weapon.effectImages = this.effectImages;
            }
        } else {
            console.error("Player class is not defined");
            return;
        }
        this.enemies = [];
        this.boss = null;
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = 1000; // milliseconds
        this.gameOver = false;
        this.score = 0;
        this.currentWave = 1;
        this.enemiesKilled = 0;
        this.waveComplete = false;
        this.isBossWave = false;
        this.bossDefeated = false;
        this.waveCooldown = 0;
        this.obstacles = [];
        this.generateObstacles();

        this.scoreElement.textContent = this.score;
        this.waveElement.textContent = this.currentWave;
        this.animationFrameId = null; // Thêm biến để theo dõi animation frame

        // Cập nhật độ khó theo wave
        this.updateDifficulty();

        // Mouse position tracking
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.controls.mouseX = e.clientX - rect.left;
            this.controls.mouseY = e.clientY - rect.top;
        });

        // Add restart handler
        this.canvas.addEventListener('click', () => {
            if (this.gameOver) {
                // Hủy animation frame cũ trước khi khởi tạo game mới
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                }
                this.initGame();
            }
        });

        console.log('Game initialized, starting game loop...');
        this.gameLoop();
    }

    async loadAssets() {
        console.log('Starting to load assets...');
        return new Promise((resolve, reject) => {
            let loadedCount = 0;
            let totalAssets = 2; // Start with player and bullet
            this.bossImages = []; // Array to store multiple boss images
            this.effectImages = []; // Array for special effects

            const onAssetLoad = () => {
                loadedCount++;
                console.log(`Loaded ${loadedCount}/${totalAssets} assets`);
                if (loadedCount === totalAssets) {
                    console.log('All assets loaded successfully!');
                    this.assetsLoaded = true;
                    resolve();
                }
            };

            const onAssetError = (e) => {
                console.error('Error loading asset:', e.target.src);
                reject(new Error(`Failed to load asset: ${e.target.src}`));
            };

            // Load bullet image first (needed early)
            console.log('Loading bullet image...');
            this.assets.bullet.onload = onAssetLoad;
            this.assets.bullet.onerror = onAssetError;
            this.assets.bullet.src = '/static/assets/noiamanhkinhhoangv1.png';

            // Load player image
            console.log('Loading player image...');
            this.assets.player.onload = onAssetLoad;
            this.assets.player.onerror = onAssetError;
            this.assets.player.src = '/static/assets/bookbang.png';

            // Load all PNG files from assets folder for enemies and bosses
            fetch('/static/assets/list')
                .then(response => {
                    console.log('Fetched assets list:', response);
                    if (!response.ok) {
                        console.warn('Could not fetch assets list, using fallback enemies');
                        // Fallback với một số hình ảnh quái cố định
                        return Promise.resolve([
                            'bookmanghen.png', 
                            'booknghienrang.png', 
                            'bookngucoc.png',
                            'hiamanhkinhhoang.png', 
                            'satnhanhangloat.png'
                        ]);
                    }
                    return response.json();
                })
                .then(files => {
                    console.log('Available asset files:', files);

                    // Select potential boss images (larger or distinctive images)
                    const bossImageNames = files.filter(file => 
                        file.endsWith('.png') && 
                        (file.includes('boss') || file.includes('2dau') || 
                         file.includes('hiamanhkinhhoang') || file.includes('khav2') ||
                         file.includes('hidi') || file.includes('satnhanhangloat'))
                    );

                    // Select regular enemy images
                    const enemyImages = files.filter(file => 
                        file.endsWith('.png') && 
                        file !== 'bookbang.png' && 
                        file !== 'noiamanhkinhhoangv1.png' &&
                        file !== 'hicuv2.png' &&
                        !bossImageNames.includes(file)
                    );

                    // Select effect images (could be any image, but preferably smaller ones)
                    const effectImageNames = files.filter(file => 
                        file.endsWith('.png') 
                    );

                    console.log('Selected enemy images:', enemyImages);
                    console.log('Selected boss images:', bossImageNames);

                    // Update total assets count
                    totalAssets += enemyImages.length + bossImageNames.length + effectImageNames.length;
                    console.log('Updated total assets count:', totalAssets);

                    // Load boss images
                    bossImageNames.forEach(imgName => {
                        const img = new Image();
                        img.onload = onAssetLoad;
                        img.onerror = onAssetError;
                        img.src = `/static/assets/${imgName}`;
                        this.bossImages.push(img);
                    });

                    // Set a random boss image as the default
                    if (bossImageNames.length > 0) {
                        this.assets.boss = this.bossImages[0]; // Will be randomized later
                    } else {
                        // Fallback if no boss images found
                        this.assets.boss = new Image();
                        this.assets.boss.onload = onAssetLoad;
                        this.assets.boss.onerror = onAssetError;
                        this.assets.boss.src = '/static/assets/hiamanhkinhhoang2dau.png';
                    }

                    // Load each enemy image
                    enemyImages.forEach(imgName => {
                        const img = new Image();
                        img.onload = onAssetLoad;
                        img.onerror = onAssetError;
                        img.src = `/static/assets/${imgName}`;
                        this.assets.enemies.push(img);
                    });

                    // Load effect images
                    effectImageNames.forEach(imgName => {
                        const img = new Image();
                        img.onload = onAssetLoad;
                        img.onerror = onAssetError;
                        img.src = `/static/assets/${imgName}`;
                        this.effectImages.push(img);
                    });
                })
                .catch(error => {
                    console.error('Error loading enemy images:', error);
                    reject(error);
                });
        });
    }

    resizeCanvas() {
        console.log('Resizing canvas for fullscreen...');
        
        // Lưu tỉ lệ cũ để tránh sự thay đổi khi vào/ra chế độ toàn màn hình
        const oldScaleFactor = this.scaleFactor;
        
        // Lấy kích thước thực của viewport
        const actualViewportHeight = window.innerHeight;
        const actualViewportWidth = window.innerWidth;
        
        // Đặt kích thước canvas để tránh scroll
        this.canvas.width = actualViewportWidth - 10;
        this.canvas.height = actualViewportHeight - 20;
        
        // Xác định tỉ lệ thiết bị
        const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
        
        // Điều chỉnh tỉ lệ tham chiếu để đảm bảo hiển thị đầy đủ map
        const referenceWidth = 900;
        const referenceHeight = 650;
        
        // Tính toán tỉ lệ ngang và dọc riêng biệt
        const widthRatio = this.canvas.width / referenceWidth;
        const heightRatio = this.canvas.height / referenceHeight;
        
        // Sử dụng tỉ lệ nhỏ hơn để đảm bảo tất cả nội dung hiển thị đầy đủ
        let baseScaleFactor = Math.min(widthRatio, heightRatio) * 0.95; // Tăng lên 95% để đảm bảo map hiển thị tốt hơn
        
        // Điều chỉnh cho các loại thiết bị - tăng kích thước trên mobile
        if (isMobile) {
            // Điện thoại ngang
            if (window.innerWidth > window.innerHeight) {
                baseScaleFactor = baseScaleFactor * 1.5; // Tăng từ 1.2 lên 1.5
            }
            // Điện thoại dọc
            else {
                baseScaleFactor = baseScaleFactor * 1.8; // Tăng từ 1.4 lên 1.8
            }
        } else {
            // PC
            baseScaleFactor = baseScaleFactor * 1.05;
        }
        
        // Giữ nguyên tỉ lệ khi chuyển đổi giữa toàn màn hình và bình thường
        // Chỉ cập nhật scaleFactor nếu là lần đầu tiên vào trò chơi hoặc thay đổi kích thước cửa sổ không phải do fullscreen
        if (!oldScaleFactor || (!this.lastFullscreenState && !document.fullscreenElement) || 
            (this.lastFullscreenState && document.fullscreenElement)) {
            this.scaleFactor = baseScaleFactor;
        }
        
        // Lưu trạng thái fullscreen hiện tại để so sánh lần sau
        this.lastFullscreenState = !!document.fullscreenElement;
        
        // Hiển thị wrapper khi ở chế độ toàn màn hình
        const gameWrapper = document.querySelector('.game-wrapper');
        if (gameWrapper && document.fullscreenElement) {
            gameWrapper.style.display = 'block';
        }
        
        // Luôn hiển thị nút điều khiển
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            // Mở rộng kích thước joystick trên mobile
            const moveJoystick = document.getElementById('moveJoystick');
            if (moveJoystick) {
                const joystickSize = Math.min(150 * this.scaleFactor, window.innerWidth * 0.25);
                moveJoystick.style.width = `${joystickSize}px`;
                moveJoystick.style.height = `${joystickSize}px`;
            }
            
            // Hiển thị nút điều khiển
            mobileControls.style.display = 'flex';
        }
        
        console.log(`Using scale factor: ${this.scaleFactor} for ${isMobile ? 'mobile' : 'desktop'}`);
    }

    updateDifficulty() {
        // Tăng độ khó theo wave
        this.enemySpawnRate = Math.max(300, 1000 - this.currentWave * 50);
        this.enemiesPerWave = 10 + (this.currentWave - 1) * 5;
    }

    startBossWave() {
        console.log(`Starting boss wave at wave ${this.currentWave}`);
        this.isBossWave = true;
        this.bossDefeated = false;

        // Xóa tất cả kẻ địch còn lại để tập trung vào boss
        this.enemies = [];

        // Chọn boss image ngẫu nhiên cho wave này
        let bossImage = this.assets.boss; // Fallback
        if (this.bossImages && this.bossImages.length > 0) {
            // Chọn ảnh boss theo cấp độ hoặc ngẫu nhiên
            const bossIndex = Math.floor(Math.random() * this.bossImages.length);
            bossImage = this.bossImages[bossIndex];
            console.log(`Selected boss image: ${bossImage.src}`);
        }

        // Tạo boss mới với cấp độ tương ứng, truyền thêm scaleFactor
        const bossLevel = Math.ceil(this.currentWave / 5);
        this.boss = new Boss(this.canvas.width, this.canvas.height, bossImage, bossLevel, this.scaleFactor);

        // Cung cấp thêm các ảnh hiệu ứng cho boss
        if (this.effectImages && this.effectImages.length > 0) {
            this.boss.effectImages = this.effectImages;
        }

        // Tăng sức mạnh của boss theo wave
        this.boss.health = 500 + (this.currentWave - 1) * 200;
        this.boss.maxHealth = this.boss.health;
        this.boss.bulletDamage = 15 + (this.currentWave - 1) * 5;
        // Tốc độ cơ bản đã được nhân với scaleFactor trong constructor

        // Hiển thị thông báo boss wave kiểu kinh dị
        this.showWaveMessage(`ÁC QUỶ CẤP ${bossLevel} XUẤT HIỆN`);
    }

    nextWave() {
        this.currentWave++;
        this.waveElement.textContent = this.currentWave;
        this.enemiesKilled = 0;
        this.waveComplete = false;
        this.isBossWave = false;
        this.bossDefeated = false;
        this.enemies = [];
        this.boss = null; // Đảm bảo xóa boss cũ
        this.updateDifficulty();
        this.obstacles = [];
        this.generateObstacles();

        // Hiển thị thông báo wave mới theo chủ đề kinh dị
        this.showWaveMessage(`CƠN ÁM ẢNH ${this.currentWave} BẮT ĐẦU`);

        // Đặt lại lastEnemySpawn để tạo enemy ngay sau khi bắt đầu wave mới
        this.lastEnemySpawn = 0;
    }

    showWaveMessage(message) {
        const waveMessage = document.getElementById('waveMessage');
        waveMessage.textContent = message;
        waveMessage.style.display = 'block';
        waveMessage.style.opacity = 1;

        // Ẩn thông báo sau 2 giây
        setTimeout(() => {
            waveMessage.style.opacity = 0;
            setTimeout(() => {
                waveMessage.style.display = 'none';
            }, 500);
        }, 2000);
    }

    showHealMessage(message) {
        const healMessage = document.getElementById('healMessage');
        healMessage.textContent = message;
        healMessage.style.display = 'block';
        healMessage.style.opacity = 1;

        setTimeout(() => {
            healMessage.style.opacity = 0;
            setTimeout(() => {
                healMessage.style.display = 'none';
            }, 500);
        }, 2000);
    }

    spawnEnemy() {
        // Không spawn kẻ địch nếu đang ở wave boss hoặc wave đã hoàn thành
        if (this.isBossWave || this.waveComplete) return;

        // Kiểm tra xem đã đủ số lượng kẻ địch cho wave này chưa
        const totalEnemies = this.enemies.length + this.enemiesKilled;
        if (totalEnemies >= this.enemiesPerWave) {
            // Nếu đã giết hết kẻ địch trong wave, đánh dấu wave hoàn thành
            if (this.enemiesKilled >= this.enemiesPerWave && this.enemies.length === 0) {
                this.waveComplete = true;
                this.waveCooldown = 180; // 3 giây ở 60fps

                // Hồi máu sau khi hoàn thành wave thường với thông báo kiểu kinh dị
                this.player.heal(100);
                this.showHealMessage("SINH LỰC HỒI PHỤC ĐẦY ĐỦ");

                // Hiển thị thông báo hoàn thành wave
                if (this.currentWave % 5 === 0) {
                    // Thông báo sắp gặp boss kiểu kinh dị
                    this.showWaveMessage(`ÁC QUỶ ĐANG THỨC TỈNH... CHUẨN BỊ!`);
                    setTimeout(() => {
                        this.startBossWave();
                    }, 1000); // Đợi 1 giây trước khi bắt đầu boss wave
                } else {
                    this.showWaveMessage(`CƠN ÁM ẢNH ${this.currentWave} ĐÃ KẾT THÚC`);
                }
            }
            return;
        }

        const now = Date.now();
        if (now - this.lastEnemySpawn >= this.enemySpawnRate && this.assets.enemies.length > 0) {
            // Choose random enemy image
            const randomEnemyImg = this.assets.enemies[Math.floor(Math.random() * this.assets.enemies.length)];
            // Truyền scaleFactor khi tạo enemy mới
            this.enemies.push(new Enemy(this.canvas.width, this.canvas.height, randomEnemyImg, this.scaleFactor));
            this.lastEnemySpawn = now;
        }
    }

    checkCollisions() {
        try {
            // Chỉ xử lý những viên đạn đang active
            const activeBullets = this.player.weapon.bullets.filter(bullet => bullet.active);

            // Check bullet-enemy collisions
            activeBullets.forEach(bullet => {
                // Chỉ kiểm tra va chạm với kẻ địch active
                for (let i = 0; i < this.enemies.length; i++) {
                    const enemy = this.enemies[i];
                    if (!enemy.active) continue;

                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    // Tối ưu bằng cách so sánh bình phương khoảng cách
                    const distanceSquared = dx * dx + dy * dy;
                    const radiusSum = enemy.radius + bullet.radius;

                    if (distanceSquared < radiusSum * radiusSum) {
                        // Đạn xuyên không bị hủy khi va chạm
                        if (bullet.type !== 'piercing') {
                            bullet.active = false;
                        }

                        if (enemy.takeDamage(bullet.damage)) {
                            this.score += 100;
                            this.enemiesKilled++;
                        }
                        // Nếu đã va chạm thì thoát vòng lặp, trừ khi là đạn xuyên
                        if (bullet.type !== 'piercing') {
                            break;
                        }
                    }
                }

                // Check bullet-boss collisions - chỉ kiểm tra nếu boss tồn tại và đạn vẫn active
                if (this.isBossWave && this.boss && this.boss.active && bullet.active) {
                    const dx = bullet.x - this.boss.x;
                    const dy = bullet.y - this.boss.y;
                    const distanceSquared = dx * dx + dy * dy;
                    const radiusSum = this.boss.radius + bullet.radius;

                    if (distanceSquared < radiusSum * radiusSum) {
                        // Đạn xuyên không bị hủy khi va chạm với boss
                        if (bullet.type !== 'piercing') {
                            bullet.active = false;
                        }

                        if (this.boss.takeDamage(bullet.damage)) {
                            console.log("Boss defeated!");
                            this.score += 1000;
                            this.bossDefeated = true;
                            this.waveComplete = true;
                            this.waveCooldown = 180; // 3 giây ở 60fps

                            // Nâng cấp vũ khí khi tiêu diệt boss
                            this.player.upgradeWeapon();

                            // Cập nhật thông tin vũ khí trên UI
                            const weaponInfo = this.player.getWeaponInfo();
                            document.getElementById('weaponValue').textContent = weaponInfo.name;

                            // Hồi máu khi đánh bại boss
                            this.player.heal(50);
                            this.showHealMessage("+50 HP");

                            // Hiển thị thông báo boss đã bị đánh bại kiểu kinh dị
                            this.showWaveMessage(`ÁC QUỶ ĐÃ BỊ TIÊU DIỆT!`);
                        }
                    }
                }
            });

            // Check player-enemy collisions
            this.enemies.forEach(enemy => {
                if (!enemy.active) return;

                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < enemy.radius + this.player.radius) {
                    if (this.player.takeDamage(0.5)) {
                        this.gameOver = true;
                    }
                }
            });

            // Check player-boss bullet collisions
            if (this.isBossWave && this.boss && this.boss.active) {
                if (this.boss.bullets && Array.isArray(this.boss.bullets)) {
                    this.boss.bullets.forEach(bullet => {
                        if (!bullet.active) return;

                        const dx = this.player.x - bullet.x;
                        const dy = this.player.y - bullet.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < this.player.radius + bullet.radius) {
                            bullet.active = false;
                            if (this.player.takeDamage(bullet.damage)) {
                                this.gameOver = true;
                            }
                        }
                    });
                }

                // Check player-boss collisions
                const dx = this.player.x - this.boss.x;
                const dy = this.player.y - this.boss.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.boss.radius + this.player.radius) {
                    if (this.player.takeDamage(1)) {
                        this.gameOver = true;
                    }
                }
            }
        } catch (error) {
            console.error("Error in collision detection:", error);
        }
    }

    update() {
        if (!this.assetsLoaded || this.gameOver) {
            return;
        }

        try {
            // Xử lý wave cooldown và chuyển sang wave tiếp theo
            if (this.waveComplete) {
                // Nếu đang ở boss wave và boss chưa bị tiêu diệt, không chuyển đến wave tiếp theo
                if (this.isBossWave && !this.bossDefeated) {
                    // Vẫn cập nhật player và boss trong trận đánh boss
                    this.player.update(this.controls, this.canvas, this);

                    if (this.boss && this.boss.active) {
                        this.boss.update(this.player.x, this.player.y, this.canvas);
                    }

                    this.checkCollisions();
                    return;
                }

                this.waveCooldown--;
                if (this.waveCooldown <= 0) {
                    this.nextWave();
                }
                // Vẫn cho phép người chơi di chuyển và bắn trong thời gian cooldown
            }

            this.player.update(this.controls, this.canvas, this);

            // Spawn kẻ địch nếu không phải wave boss
            if (!this.isBossWave) {
                this.spawnEnemy();
            }

            // Cập nhật kẻ địch
            this.enemies = this.enemies.filter(enemy => enemy.active);
            this.enemies.forEach(enemy => {
                enemy.update(this.player.x, this.player.y);
            });

            // Cập nhật boss nếu đang trong wave boss
            if (this.isBossWave && this.boss && this.boss.active) {
                this.boss.update(this.player.x, this.player.y, this.canvas);
            }

            // Cập nhật các hiệu ứng
            this.updateEffects();

            this.checkCollisions();
        } catch (error) {
            console.error("Error in game update:", error);
        }
    }

    // Phương thức cập nhật hiệu ứng
    updateEffects() {
        if (!this.effects) return;

        this.effects = this.effects.filter(effect => {
            effect.timer++;
            return effect.timer < effect.maxTime;
        });
    }

    // Kiểm tra và hiển thị điều khiển mobile
    checkMobileControls() {
        // Hiển thị điều khiển mobile dựa trên kích thước màn hình hoặc trạng thái toàn màn hình
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.style.display = 'flex';
        }
    }
    
    // Phương thức vẽ hiệu ứng
    drawEffects() {
        if (!this.effects || this.effects.length === 0) return;
        
        // Đảm bảo điều khiển mobile luôn hiển thị
        this.checkMobileControls();

        this.effects.forEach(effect => {
            const fade = 1 - effect.timer / effect.maxTime;
            const size = effect.radius * (1 + effect.timer / 10);

            this.ctx.save();
            this.ctx.globalAlpha = fade;
            this.ctx.translate(effect.x, effect.y);

            // Vẽ hiệu ứng bằng hình ảnh nếu có
            if (effect.image) {
                this.ctx.drawImage(
                    effect.image,
                    -size/2,
                    -size/2,
                    size,
                    size
                );
            } else {
                // Vẽ hiệu ứng mặc định nếu không có hình ảnh
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size/2);
                gradient.addColorStop(0, 'rgba(255, 200, 50, ' + fade + ')');
                gradient.addColorStop(0.5, 'rgba(255, 100, 0, ' + fade * 0.8 + ')');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        });
    }

    draw() {
        if (!this.assetsLoaded) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Đang tải trò chơi...', this.canvas.width/2, this.canvas.height/2);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw boss background on all waves (showing current boss during boss wave)
        this.drawBossBackground();

        // Draw grid lines for visual effect
        this.ctx.strokeStyle = 'rgba(50, 50, 100, 0.2)';
        this.ctx.lineWidth = 1;

        // Draw horizontal grid lines
        for (let i = 0; i < this.canvas.height; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }

        // Draw vertical grid lines
        for (let i = 0; i < this.canvas.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }

        this.drawObstacles();
        this.drawEffects(); // Vẽ các hiệu ứng
        this.player.draw(this.ctx);
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Vẽ boss nếu đang trong wave boss
        if (this.boss && this.boss.active) {
            this.boss.draw(this.ctx);
        }

        // Vẽ thông tin game trực tiếp trên canvas (góc phải dưới)
        this.drawGameStats();

        if (this.gameOver) {
            // Nếu đây là frame đầu tiên của game over, tạo hiệu ứng vỡ vụn
            if (!this.gameOverEffectCreated) {
                this.createDeathEffect();
                this.gameOverEffectCreated = true;

                // Vẽ hiệu ứng máu ở nền
                this.createBloodSplatter();
            }

            // Vẽ hiệu ứng màn hình máu
            const gradientBg = this.ctx.createRadialGradient(
                this.canvas.width/2, this.canvas.height/2, 10,
                this.canvas.width/2, this.canvas.height/2, this.canvas.width
            );
            gradientBg.addColorStop(0, 'rgba(100, 0, 0, 0.8)');
            gradientBg.addColorStop(0.5, 'rgba(60, 0, 0, 0.7)');
            gradientBg.addColorStop(1, 'rgba(20, 0, 0, 0.9)');

            this.ctx.fillStyle = gradientBg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Vẽ các vệt máu ngẫu nhiên
            if (this.bloodStains) {
                this.bloodStains.forEach(stain => {
                    this.ctx.save();
                    this.ctx.globalAlpha = stain.opacity;
                    this.ctx.translate(stain.x, stain.y);
                    this.ctx.rotate(stain.angle);
                    this.ctx.fillStyle = stain.color;

                    // Vẽ vệt máu
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.bezierCurveTo(
                        stain.size/3, stain.size/2, 
                        stain.size/2, stain.size, 
                        stain.size, 0
                    );
                    this.ctx.fill();
                    this.ctx.restore();
                });
            }

            // Vẽ hiệu ứng nhấp nháy
            const flickerIntensity = Math.random() > 0.9 ? 0.7 : 1;

            // Text Game Over với hiệu ứng kinh dị
            this.ctx.save();
            this.ctx.shadowColor = '#ff0000';
            this.ctx.shadowBlur = 20 * flickerIntensity;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = 'bold 60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.globalAlpha = flickerIntensity;

            // Vẽ text lệch một chút để tạo hiệu ứng glitch
            const offsetX = Math.random() * 4 - 2;
            const offsetY = Math.random() * 4 - 2;
            this.ctx.fillText('LINH HỒN BIẾN MẤT', this.canvas.width/2 + offsetX, this.canvas.height/2 - 50 + offsetY);
            this.ctx.restore();

            // Thông tin game over
            this.ctx.fillStyle = '#ffaaaa';
            this.ctx.font = '26px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Linh hồn thu được: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 20);
            this.ctx.fillText(`Đã trải qua: ${this.currentWave} cơn ám ảnh`, this.canvas.width/2, this.canvas.height/2 + 60);

            // Nút chơi lại với hiệu ứng
            const btnY = this.canvas.height/2 + 120;
            const btnWidth = 200;
            const btnHeight = 50;
            const btnX = this.canvas.width/2 - btnWidth/2;

            // Vẽ nút với hiệu ứng nhấp nháy
            this.ctx.fillStyle = `rgba(80, 0, 0, ${0.8 * flickerIntensity})`;
            this.ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
            this.ctx.strokeStyle = `rgba(255, 0, 0, ${0.9 * flickerIntensity})`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText('CHẤP NHẬN ĐỊNH MỆNH', this.canvas.width/2, btnY + 33);

            // Vẽ các hình ảnh nhỏ của player xung quanh (nếu đã được tạo)
            if (this.deathFragments) {
                this.deathFragments.forEach(fragment => {
                    this.ctx.save();
                    this.ctx.globalAlpha = fragment.opacity;
                    this.ctx.translate(fragment.x, fragment.y);
                    this.ctx.rotate(fragment.rotation);
                    this.ctx.drawImage(
                        this.assets.player,
                        -fragment.size/2,
                        -fragment.size/2,
                        fragment.size,
                        fragment.size
                    );
                    this.ctx.restore();

                    // Cập nhật vị trí của mảnh vỡ
                    fragment.x += fragment.vx;
                    fragment.y += fragment.vy;
                    fragment.rotation += fragment.rotationSpeed;
                    fragment.opacity -= 0.002;

                    // Giảm tốc độ dần dần
                    fragment.vx *= 0.98;
                    fragment.vy *= 0.98;

                    // Thêm gravity nhẹ
                    fragment.vy += 0.05;
                });

                // Lọc bỏ các mảnh vỡ đã biến mất
                this.deathFragments = this.deathFragments.filter(f => f.opacity > 0);
            }
        }
    }

    // Vẽ thông số game bằng tiếng việt ở góc màn hình theo chủ đề kinh dị
    drawGameStats() {
        const padding = 10;
        const cornerX = this.canvas.width - 200;
        const cornerY = this.canvas.height - 110;
        const width = 200;
        const height = 120;

        // Vẽ nền bán trong suốt với viền kiểu máu
        this.ctx.fillStyle = 'rgba(20, 0, 0, 0.7)';
        this.ctx.fillRect(cornerX - padding, cornerY - padding, width, height);

        // Viền máu
        this.ctx.strokeStyle = 'rgba(180, 0, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(cornerX - padding, cornerY - padding, width, height);

        // Thêm giọt máu ở góc
        this.drawBloodDrop(cornerX - padding, cornerY - padding);
        this.drawBloodDrop(cornerX + width - padding - 10, cornerY - padding);

        // Thiết lập kiểu text
        this.ctx.fillStyle = '#ff6666';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';

        // Các thông số game với chủ đề kinh dị
        const statLabels = [
            `Linh hồn: ${this.score}`,
            `Cơn ám ảnh: ${this.currentWave}`,
            `Vũ khí: ${this.getWeaponNameVN()}`,
            `Sinh lực: ${Math.floor(this.player.health)}/100`
        ];

        // Thêm dòng thông tin về tiến độ đợt hiện tại
        if (!this.isBossWave && !this.waveComplete) {
            statLabels.push(`Đã tiêu diệt: ${this.enemiesKilled}/${this.enemiesPerWave} ám ảnh`);
        } else if (this.isBossWave && this.boss) {
            statLabels.push(`Sinh lực ÁC QUỶ: ${this.boss.health}/${this.boss.maxHealth}`);
        }

        // Vẽ từng dòng thông tin
        statLabels.forEach((label, index) => {
            this.ctx.fillText(label, cornerX, cornerY + index * 22);
        });
    }

    // Vẽ giọt máu
    drawBloodDrop(x, y) {
        this.ctx.beginPath();
        this.ctx.fillStyle = '#990000';
        this.ctx.arc(x + 5, y + 5, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Giọt máu đang chảy
        this.ctx.beginPath();
        this.ctx.fillStyle = '#cc0000';
        this.ctx.moveTo(x + 5, y + 10);
        this.ctx.lineTo(x + 2, y + 20);
        this.ctx.lineTo(x + 8, y + 20);
        this.ctx.closePath();
        this.ctx.fill();
    }

    // Lấy tên vũ khí bằng tiếng Việt theo chủ đề kinh dị
    getWeaponNameVN() {
        const weaponType = this.player ? this.player.weapon.bulletType : 'normal';
        const weaponLevel = this.player ? this.player.weapon.weaponLevel : 1;

        const weaponNames = {
            'normal': 'Ma quái cấp thấp',
            'spread': 'Bùa chú tỏa rộng',
            'explosive': 'Ngọn lửa địa ngục',
            'homing': 'Linh hồn săn mồi',
            'piercing': 'Móng vuốt ác quỷ'
        };

        return `${weaponNames[weaponType]} (${weaponLevel}✟)`;
    }

    updateUI() {
        // Update score, wave, weapon info
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('waveValue').textContent = this.currentWave;

        // Update health display
        if (this.player) {
            document.getElementById('healthValue').textContent = Math.floor(this.player.health);
        }
    }

    gameLoop() {
        try {
            this.update();
            this.draw();
            this.updateUI(); // Make sure UI is being updated
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        } catch (error) {
            console.error('Error in game loop:', error);
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
        }
    }

    generateObstacles() {
        const numObstacles = 1 + this.currentWave * 2; // Increase obstacles with wave
        const playerSafeZone = 100; // Safe zone around player
        const minObstacleSize = 40;
        const maxObstacleSize = 60;

        // Find baccu image in assets
        let baccuImage = null;
        if (this.assets && this.assets.enemies) {
            for (const img of this.assets.enemies) {
                if (img.src.includes('baccu.png')) {
                    baccuImage = img;
                    break;
                }
            }
        }

        for (let i = 0; i < numObstacles; i++) {
            let x, y, size;
            let validPosition = false;

            // Try to find a valid position that's not too close to the player
            for (let attempts = 0; attempts < 10; attempts++) {
                x = Math.random() * (this.canvas.width - maxObstacleSize) + minObstacleSize;
                y = Math.random() * (this.canvas.height - maxObstacleSize) + minObstacleSize;
                size = Math.random() * (maxObstacleSize - minObstacleSize) + minObstacleSize;

                // Calculate distance to player (center of the canvas at initialization)
                const playerX = this.player ? this.player.x : this.canvas.width / 2;
                const playerY = this.player ? this.player.y : this.canvas.height / 2;
                const distToPlayer = Math.sqrt(
                    Math.pow(x - playerX, 2) + 
                    Math.pow(y - playerY, 2)
                );

                // If obstacle is far enough from player, accept it
                if (distToPlayer > playerSafeZone) {
                    validPosition = true;
                    break;
                }
            }

            if (validPosition) {
                this.obstacles.push({ 
                    x, 
                    y, 
                    size,
                    image: baccuImage 
                });
            }
        }
    }

    drawObstacles() {
        this.obstacles.forEach(obstacle => {
            if (obstacle.image) {
                // Use baccu image for obstacles
                this.ctx.drawImage(
                    obstacle.image,
                    obstacle.x,
                    obstacle.y,
                    obstacle.size,
                    obstacle.size
                );
            } else {
                // Fallback to rect if image not available
                this.ctx.fillStyle = 'grey';
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.size, obstacle.size);
            }
        });
    }

    checkObstacleCollision(x, y, radius) {
        for (const obstacle of this.obstacles) {
            // Distance check between circle (player) and rectangle (obstacle)
            const distX = Math.abs(x - obstacle.x - obstacle.size/2);
            const distY = Math.abs(y - obstacle.y - obstacle.size/2);

            if (distX > (obstacle.size/2 + radius)) continue;
            if (distY > (obstacle.size/2 + radius)) continue;

            if (distX <= (obstacle.size/2)) return true;
            if (distY <= (obstacle.size/2)) return true;

            const dx = distX - obstacle.size/2;
            const dy = distY - obstacle.size/2;
            return (dx*dx + dy*dy <= radius*radius);
        }
        return false;
    }

    drawBossBackground() {
        if (!this.assets.boss) return;

        // Calculate which boss is next
        const nextBossLevel = Math.ceil((this.currentWave < 5 ? 5 : this.currentWave + 5) / 5);

        // Draw a faint, large boss image in the background
        this.ctx.save();
        this.ctx.globalAlpha = 0.1; // Make it very transparent

        // Draw the boss image centered and covering most of the background
        const bossSize = Math.max(this.canvas.width, this.canvas.height) * 0.8;
        const x = (this.canvas.width - bossSize) / 2;
        const y = (this.canvas.height - bossSize) / 2;

        // Choose boss image based on current or upcoming boss level
        let bossImage = this.assets.boss;
        if (this.bossImages && this.bossImages.length > 0) {
            // Trong wave boss, sử dụng ảnh của boss hiện tại
            if (this.isBossWave && this.boss) {
                bossImage = this.boss.image;
            } else {
                // Trong wave thường, sử dụng một boss ngẫu nhiên cho background
                const bossIndex = Math.floor(Date.now() / 10000) % this.bossImages.length;
                bossImage = this.bossImages[bossIndex];
            }
        }

        // If we're approaching a boss wave (last wave before boss), make it more visible
        if (this.currentWave % 5 === 0) {
            this.ctx.globalAlpha = 0.2;

            // Thêm hiệu ứng đảo màu cho boss sắp xuất hiện
            this.ctx.filter = 'invert(1)';

            // Add warning text
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillStyle = 'red';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`BOSS FIGHT IS COMING`, this.canvas.width/2, this.canvas.height - 50);
        }

        // Draw the boss image with pulse effect (stronger in boss wave)
        const pulseIntensity = this.isBossWave ? 0.08 : 0.05;
        const pulseSize = 1 + Math.sin(Date.now() * 0.001) * pulseIntensity;
        const adjustedSize = bossSize * pulseSize;
        const adjustedX = x - (adjustedSize - bossSize) / 2;
        const adjustedY = y - (adjustedSize - bossSize) / 2;

        // Trong wave boss, hiển thị ảnh rõ nét hơn với hiệu ứng đặc biệt
        if (this.isBossWave) {
            this.ctx.globalAlpha = 0.15;
            this.ctx.filter = 'contrast(1.2) brightness(0.8)';
        }

        this.ctx.drawImage(bossImage, adjustedX, adjustedY, adjustedSize, adjustedSize);

        // Trong wave boss, hiển thị các hiệu ứng dạng vầng sáng
        if (this.isBossWave) {
            this.ctx.globalAlpha = 0.1;
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width/2, this.canvas.height/2, 0,
                this.canvas.width/2, this.canvas.height/2, bossSize/2
            );
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
            gradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        // Wave thường thì hiển thị nhiều ảnh boss trong nền
        else if (this.bossImages && this.bossImages.length > 1 && this.currentWave % 5 === 4) {
            this.ctx.globalAlpha = 0.05;

            // Draw 3 smaller boss images in the background
            for (let i = 1; i <= 3; i++) {
                const smallBossIndex = (Math.floor(Date.now() / 10000) + i) % this.bossImages.length;
                const smallBossImage = this.bossImages[smallBossIndex];
                const smallSize = bossSize * 0.4;
                const angle = Date.now() * 0.001 + i * Math.PI * 2 / 3;
                const offsetX = Math.cos(angle) * bossSize * 0.3;
                const offsetY = Math.sin(angle) * bossSize * 0.3;

                this.ctx.drawImage(
                    smallBossImage, 
                    x + bossSize/2 - smallSize/2 + offsetX, 
                    y + bossSize/2 - smallSize/2 + offsetY, 
                    smallSize, 
                    smallSize
                );
            }
        }

        // Add label showing which boss this is
        this.ctx.globalAlpha = 0.4;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';

        if (this.isBossWave) {
            this.ctx.fillText(`ĐANG CHIẾN ĐẤU VỚI BOSS ${Math.ceil(this.currentWave / 5)}`, 
                this.canvas.width/2, this.canvas.height/2 + bossSize/2 + 30);
        } else {
            this.ctx.fillText(`BOSS ${nextBossLevel}`, 
                this.canvas.width/2, this.canvas.height/2 + bossSize/2 + 30);
        }

        this.ctx.restore();
    }

    cleanup() {
        console.log('Cleaning up game instance...');
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        // Remove event listeners
        window.removeEventListener('resize', () => this.resizeCanvas());
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove');
            this.canvas.removeEventListener('click');
        }
        // Stop game loop
        this.assetsLoaded = false;
    }


    // Tạo hiệu ứng khi nhân vật chết
    createDeathEffect() {
        // Tạo các mảnh vỡ từ hình ảnh player
        const numFragments = 15;
        this.deathFragments = [];

        for (let i = 0; i < numFragments; i++) {
            // Tạo các mảnh vỡ với kích thước khác nhau
            const size = Math.random() * 20 + 10;

            // Vị trí ban đầu là vị trí của player
            const fragment = {
                x: this.player.x,
                y: this.player.y,
                size: size,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 5, // Thêm lực đẩy lên trên
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                opacity: 1
            };

            this.deathFragments.push(fragment);
        }
    }

    // Tạo hiệu ứng máu tung tóe trên màn hình
    createBloodSplatter() {
        const numStains = 30;
        this.bloodStains = [];

        for (let i = 0; i < numStains; i++) {
            const stain = {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 100 + 50,
                angle: Math.random() * Math.PI * 2,
                color: `rgb(${Math.floor(Math.random() * 100 + 155)}, 0, 0)`,
                opacity: Math.random() * 0.5 + 0.2
            };

            this.bloodStains.push(stain);
        }
    }

    startGame() {
        this.initGame();
    }
}

// Tạo instance game khi trang đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, creating game instance...');
    window.gameInstance = new Game();
});

// Start game when page loads
window.addEventListener('load', () => {
    console.log('Starting game initialization...');

    // Cleanup previous game instance if exists
    if (window.game) {
        console.log('Found existing game instance, cleaning up...');
        window.game.cleanup();
    }

    // Create new game instance
    window.game = new Game();
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, creating new Game instance');
    window.gameInstance = new Game();

    // Màn hình bắt đầu
    const startScreen = document.getElementById('startScreen');
    const startButton = document.getElementById('startButton');
    const gameWrapper = document.querySelector('.game-wrapper');
    const gameHeader = document.querySelector('.game-header');

    if (startButton) {
        startButton.addEventListener('click', () => {
            startScreen.style.display = 'none';
            gameWrapper.style.display = 'flex';
            gameHeader.style.display = 'block';
            window.gameInstance.initGame();
        });
    }
});