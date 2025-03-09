class Enemy {
    constructor(canvasWidth, canvasHeight, enemyImage) {
        this.radius = 15;
        this.speed = 2;
        this.health = 100;
        this.active = true;
        this.image = enemyImage;
        this.width = 30;  // width of enemy sprite
        this.height = 30; // height of enemy sprite

        // Spawn enemy outside the canvas
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Top
                this.x = Math.random() * canvasWidth;
                this.y = -this.radius;
                break;
            case 1: // Right
                this.x = canvasWidth + this.radius;
                this.y = Math.random() * canvasHeight;
                break;
            case 2: // Bottom
                this.x = Math.random() * canvasWidth;
                this.y = canvasHeight + this.radius;
                break;
            case 3: // Left
                this.x = -this.radius;
                this.y = Math.random() * canvasHeight;
                break;
        }
    }

    update(playerX, playerY) {
        if (!this.active) return;

        // Move towards player
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw enemy image
        ctx.drawImage(
            this.image,
            -this.width/2,
            -this.height/2,
            this.width,
            this.height
        );

        // Health bar
        const healthBarWidth = this.width;
        const healthBarHeight = 4;
        const healthPercent = this.health / 100;

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            -healthBarWidth/2,
            -this.height/2 - 10,
            healthBarWidth,
            healthBarHeight
        );

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(
            -healthBarWidth/2,
            -this.height/2 - 10,
            healthBarWidth * healthPercent,
            healthBarHeight
        );

        ctx.restore();
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.active = false;
            return true; // Enemy died
        }
        return false;
    }
}