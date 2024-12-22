//an you add a pause menu that shows up when press menu on controller or esc, only in game, when gamerunning is true. Can be toggled with the same key to hide it and go back to the game. Run stats that looks the same as they do in stats are shown on the right, the middle of the screen should still be clear, the left should have a few options, resume and quit

class UIElement {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.hovered = false;
        this.visible = true;
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.fillStyle = this.hovered ? 'lightgray' : 'gray';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    isMouseOver(mouseX, mouseY) {
        return mouseX >= this.x && mouseX <= this.x + this.width &&
               mouseY >= this.y && mouseY <= this.y + this.height;
    }

    onClick() {}
    onHover() {}
}

class UIButton extends UIElement {
    constructor(x, y, width, height, text, onClick) {
        super(x, y, width, height);
        this.text = text;
        this.onClick = onClick;
    }

    draw(ctx) {
        super.draw(ctx);
        ctx.fillStyle = this.hovered ? 'darkgray' : 'gray'; // Change color on hover
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
    }
}

class UIPanel extends UIElement {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.children = [];
    }

    addChild(child) {
        this.children.push(child);
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.fillStyle = 'rgba(127, 127, 127, 1)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        this.children.forEach(child => child.draw(ctx));
    }

    handleMouseMove(mouseX, mouseY, ctx) {
        this.children.forEach(child => {
            const wasHovered = child.hovered;
            child.hovered = child.isMouseOver(mouseX, mouseY);
            if (child.hovered !== wasHovered) {
                this.draw(ctx); // Pass the context to draw
            }
        });
    }

    handleClick(mouseX, mouseY) {
        this.children.forEach(child => {
            if (child.isMouseOver(mouseX, mouseY)) {
                child.onClick();
            }
        });
    }
}

class UIManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.panels = [];
        this.selectedOptionIndex = 0; // Track the currently selected option
        this.lastGamepadState = null; // Store the last gamepad state
        this.setupEventListeners();
    }

    addPanel(panel) {
        this.panels.push(panel);
    }

    draw(resetTransform = true, drawBackground = true) {
        if (resetTransform) {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        
        if (drawBackground) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white background
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.panels.forEach(panel => panel.draw(this.ctx));
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            this.panels.forEach(panel => panel.handleMouseMove(mouseX, mouseY, this.ctx));
        });

        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            this.panels.forEach(panel => panel.handleClick(mouseX, mouseY));
        });

        window.addEventListener('gamepadconnected', () => {
            this.checkGamepadInput();
        });
    }

    checkGamepadInput() {
        this.panels.forEach(panel => {
            panel.draw(this.ctx);
        });
    
        const gamepad = navigator.getGamepads()[0];
        if (!gamepad) return;
    
        const axisThreshold = 0.5;
        const currentGamepadState = {
            menu: gamepad.buttons[9].pressed, // Assuming 'Menu' button is button 9
            up: gamepad.axes[1] < -axisThreshold || gamepad.buttons[12].pressed, // Include D-pad up
            down: gamepad.axes[1] > axisThreshold || gamepad.buttons[13].pressed, // Include D-pad down
            select: gamepad.buttons[0].pressed // Assuming 'A' button for selection
        };
    
        try {
            if (this.lastGamepadState) {
                if (currentGamepadState.menu && !this.lastGamepadState.menu && game.gameRunning) {
                    game.togglePause();
                } else if (currentGamepadState.up && !this.lastGamepadState.up) {
                    this.selectedOptionIndex = (this.selectedOptionIndex - 1 + this.panels[0].children.length) % this.panels[0].children.length;
                    this.updateHoveredState();
                } else if (currentGamepadState.down && !this.lastGamepadState.down) {
                    this.selectedOptionIndex = (this.selectedOptionIndex + 1) % this.panels[0].children.length;
                    this.updateHoveredState();
                } else if (currentGamepadState.select && !this.lastGamepadState.select) {
                    this.panels[0].children[this.selectedOptionIndex].onClick();
                    this.draw(false, false);
                }
            }
        } catch (error) {
            
        }
        this.lastGamepadState = currentGamepadState;
        requestAnimationFrame(this.checkGamepadInput.bind(this));
    }
    

    updateHoveredState() {
        this.panels[0].children.forEach((child, index) => {
            child.hovered = index === this.selectedOptionIndex;
        });
        this.draw(false, false);
    }
}

class Player {
    constructor(x, y, worldSize = 1000) {
        this.x = x;
        this.y = y;
        this.prevX = 0;
        this.prevY = 0;
        this.size = 20;
        this.angle = 0;
        this.xp = 0;
        this.level = 1;
        this.xpToNextLevel = 10;
        this.health = 3;
        this.maxHealth = 3;
        this.upgrades = {
            bulletSpeed: 3,
            bulletSize: 5,
            fireRate: 500,
            bulletDamage: 1,
            health: 3,
            healthRegen: 0,
            speed: 3,
            xpDropRate: 1,
            pickupRange: 15,
            bulletPenetration: 1,
            xpGravitationSpeed: 0.05,
            xpGravitationRange: 100,
            upgradeCount: 3
        };

        this.worldSize = worldSize;
        this.gamepad = false;
    }

    updatePosition(newX, newY) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x = newX;
        this.y = newY;
    }

    getVelocity() {
        const vx = this.x - this.prevX;
        const vy = this.y - this.prevY;
        return { vx, vy };
    }

    getAvailableUpgrades() {
        return Object.keys(this.upgrades);
    }

    applyUpgrade(upgrade) {
        const upgradeLogic = {
            bulletSpeed: () => this.upgrades.bulletSpeed += 2 / Math.log2(this.upgrades.bulletSpeed),
            bulletSize: () => this.upgrades.bulletSize += 5 / Math.log2(this.upgrades.bulletSize),
            fireRate: () => {
                const decayFactor = 0.5; // Initial decay factor (20%)
                this.upgrades.fireRate *= (1 - decayFactor / Math.log2(this.upgrades.fireRate));
            },
            bulletDamage: () => this.upgrades.bulletDamage += 1,
            health: () => {
                this.upgrades.health += 1;
                this.maxHealth += 1;
                this.health += this.health / this.maxHealth;
            },
            speed: () => this.upgrades.speed += 2 / Math.log2(this.upgrades.speed),
            xpDropRate: () => this.upgrades.xpDropRate += 0.5 / Math.log2(this.upgrades.xpDropRate + 1),
            pickupRange: () => this.upgrades.pickupRange += 10 / Math.log2(this.upgrades.pickupRange),
            healthRegen: () => this.upgrades.healthRegen += 0.05,
            bulletPenetration: () => this.upgrades.bulletPenetration += 1,
            xpGravitationSpeed: () => this.upgrades.xpGravitationSpeed += 0.1 / Math.log2(this.upgrades.xpGravitationSpeed + 2),
            xpGravitationRange: () => this.upgrades.xpGravitationRange += 50 / (Math.log2(this.upgrades.xpGravitationRange / 2) - 1),
            upgradeCount: () => this.upgrades.upgradeCount += Math.min(this.getAvailableUpgrades().length - 1, 1.585 / Math.log2(this.upgrades.upgradeCount))
        };
    
        if (upgradeLogic[upgrade]) {
            const before = this.upgrades[upgrade];
            upgradeLogic[upgrade]();
            const after = this.upgrades[upgrade];
            return `${upgrade}: ${simplifyNumber(before)} -> ${simplifyNumber(after)}`;
        }
        return null;
    }


    move(keysPressed, gamepad) {
        this.gamepad = gamepad
        let dx = 0;
        let dy = 0;
        const deadzone = 0.33; // Define the deadzone threshold

        // Keyboard input
        if (keysPressed['ArrowUp'] || keysPressed['w']) dy -= 1;
        if (keysPressed['ArrowDown'] || keysPressed['s']) dy += 1;
        if (keysPressed['ArrowLeft'] || keysPressed['a']) dx -= 1;
        if (keysPressed['ArrowRight'] || keysPressed['d']) dx += 1;

        // Gamepad input
        if (this.gamepad) {
            const leftStickX = gamepad.axes[0]; // Left stick X-axis
            const leftStickY = gamepad.axes[1]; // Left stick Y-axis

            // Apply deadzone
            if (Math.abs(leftStickX) > deadzone) dx += leftStickX;
            if (Math.abs(leftStickY) > deadzone) dy += leftStickY;
        }

        // Normalize movement
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
            dx /= length;
            dy /= length;
        }

        // Update the player's position
        const newX = this.x + dx * this.upgrades.speed;
        const newY = this.y + dy * this.upgrades.speed;
        this.updatePosition(newX, newY);

        // Gamepad aiming
        if (this.gamepad) {
            const aimX = gamepad.axes[2]; // Right stick X-axis
            const aimY = gamepad.axes[3]; // Right stick Y-axis
            if (Math.abs(aimX) > deadzone || Math.abs(aimY) > deadzone) {
                this.angle = Math.atan2(aimY, aimX);
            }
        }
        
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = 'red';
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();

        this.drawHealthBar(ctx);
        if (this.gamepad) {
            this.drawAimLine(ctx);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = 40;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size / 2 - 10;

        ctx.fillStyle = 'black';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthRatio = this.health / this.maxHealth;
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.health)}/${this.maxHealth}`, this.x, barY + barHeight - 1);
    }

    drawAimLine(ctx) {
        const lineLength = 200; // Length of the aim line
        const endX = this.x + Math.cos(this.angle) * lineLength;
        const endY = this.y + Math.sin(this.angle) * lineLength;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}

class Projectile {
    constructor(x, y, vx, vy, canDamagePlayer = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.hitCount = 0; // Track how many unique enemies the projectile has hit
        this.hitEnemies = new Set(); // Track unique enemies hit
        this.canDamagePlayer = false;
        this.dragFactor = 0.998; // Adjust this value to change the drag effect
    }

    getColor() {
        // Calculate the velocity magnitude
        const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        // Define color based on velocity
        const minVelocity = 0;
        const maxVelocity = 10; // Adjust this based on expected max velocity

        const factor = Math.min((velocity - minVelocity) / (maxVelocity - minVelocity), 1);

        const startColor = { r: 255, g: 255, b: 255 }; // White for low velocity
        const endColor = { r: 255, g: 0, b: 0 }; // Red for high velocity

        const r = Math.round(startColor.r + factor * (endColor.r - startColor.r));
        const g = Math.round(startColor.g + factor * (endColor.g - startColor.g));
        const b = Math.round(startColor.b + factor * (endColor.b - startColor.b));
        let a = 1;
        if (velocity <= 2) {
            a = Math.max(0, velocity - 1);
        }

        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    update() {
        const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        this.vx *= this.dragFactor;
        this.vy *= this.dragFactor;
        this.x += this.vx;
        this.y += this.vy;

        if (velocity < 1) {
            this.vx = 0;
            this.vy = 0;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy {
    constructor(x, y, speed, health, level) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.health = health;
        this.maxHealth = health; // Store max health
        this.level = level;
        this.radius = 15; // Assuming a radius for collision detection
    }

    update(player, enemies) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        // Check for collisions with other enemies
        enemies.forEach(other => {
            if (other !== this) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = this.radius + other.radius;

                if (distance < minDistance) {
                    // Resolve collision based on levels
                    const overlap = minDistance - distance;
                    const pushFactor = this.level >= other.level ? 1 : -1;
                    const pushX = (dx / distance) * overlap * pushFactor;
                    const pushY = (dy / distance) * overlap * pushFactor;

                    if (this.level >= other.level) {
                        other.x += pushX;
                        other.y += pushY;
                    } else {
                        this.x -= pushX;
                        this.y -= pushY;
                    }
                }
            }
        });

        if (this.x < player.x - player.worldSize) this.x += player.worldSize * 2;
        if (this.x > player.x + player.worldSize) this.x -= player.worldSize * 2;
        if (this.y < player.y - player.worldSize) this.y += player.worldSize * 2;
        if (this.y > player.y + player.worldSize) this.y -= player.worldSize * 2;
    }

    draw(ctx) {
        // Define the start and end colors for interpolation
        const startColor = { r: 64, g: 0, b: 0 }; // Green for low level
        const endColor = { r: 255, g: 0, b: 0 };   // Red for high level

        // Calculate the interpolation factor based on the level
        const maxLevel = 15; // Define the maximum level for color transition
        const factor = Math.min(this.level / maxLevel, 1);

        // Interpolate between the start and end colors
        const r = Math.round(startColor.r + factor * (endColor.r - startColor.r));
        const g = Math.round(startColor.g + factor * (endColor.g - startColor.g));
        const b = Math.round(startColor.b + factor * (endColor.b - startColor.b));

        // Set the fill style to the interpolated color
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();

        this.drawHealthBar(ctx);
    }

    drawHealthBar(ctx) {
        const barWidth = 30;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 20;

        ctx.fillStyle = 'black';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthRatio = this.health / this.maxHealth;
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.health)}/${this.maxHealth}`, this.x, barY + barHeight - 1);
    }
}

class SpikyEnemy extends Enemy {
    constructor(x, y, speed, health, level, radius = 5) {
        super(x, y, speed, health, level);
        this.radius = radius; // Initial radius
        this.vx = 0; // Velocity in x direction
        this.vy = 0; // Velocity in y direction
        this.angle = 0; // Angle for circular movement
    }

    update(player, enemies, xpObjects) {
        // Find the three largest XP orbs
        if (xpObjects.length < 3) return;

        const sortedXP = xpObjects.slice().sort((a, b) => b.amount - a.amount);
        const topThreeXP = sortedXP.slice(0, 3);

        // Calculate the centroid of the three largest XP orbs
        const centroidX = topThreeXP.reduce((sum, xp) => sum + xp.x, 0) / 3;
        const centroidY = topThreeXP.reduce((sum, xp) => sum + xp.y, 0) / 3;

        // Calculate the vector from the enemy to the centroid
        const dx = centroidX - this.x;
        const dy = centroidY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate the desired velocity for circular movement
        const orbitRadius = 50; // Radius of the circular path
        const speed = 2; // Speed of the enemy
        const tangentX = -dy / distance; // Tangential direction
        const tangentY = dx / distance;

        // Adjust velocity to follow the circular path
        this.vx = tangentX * speed;
        this.vy = tangentY * speed;

        // Update position based on velocity
        this.x += this.vx;
        this.y += this.vy;

        // Check for XP absorption
        xpObjects.forEach((xp, index) => {
            const dx = xp.x - this.x;
            const dy = xp.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.radius * (this.health / this.maxHealth) + 5) { // Assuming XP radius is 5
                // this.health += Math.floor(xp.amount * (this.health / this.maxHealth) / Math.log2(this.health));
                // this.maxHealth += Math.floor(xp.amount / Math.log2(this.maxHealth));
                // this.radius += Math.sqrt(xp.amount) / Math.log2(this.radius); // Increase size based on XP amount
                // this.level = this.health;
                // xpObjects.splice(index, 1); // Remove absorbed XP
                this.increaseStats(xp.amount, enemies, index);
            }
        });

        // Swallow other enemies if radius is more than twice theirs
        enemies.forEach((other, index) => {
            if (other !== this) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.radius* (this.health / this.maxHealth) && this.radius * (this.health / this.maxHealth) > 2 * other.radius) {
                    // this.health += Math.floor(other.health * (this.health / this.maxHealth) / Math.log2(this.health));
                    // this.maxHealth += Math.floor(other.health / Math.log2(this.maxHealth));
                    // this.radius += Math.sqrt(other.health) / Math.log2(this.radius); // Increase size based on absorbed health
                    // this.level = this.health;
                    // enemies.splice(index, 1); // Remove swallowed enemy
                    this.increaseStats(other.health, enemies, index);
                }
            }
        });

        // Loop around if out of bounds
        if (this.x < player.x - player.worldSize) this.x += player.worldSize * 2;
        if (this.x > player.x + player.worldSize) this.x -= player.worldSize * 2;
        if (this.y < player.y - player.worldSize) this.y += player.worldSize * 2;
        if (this.y > player.y + player.worldSize) this.y -= player.worldSize * 2;
    }

    increaseStats(val, list, index) {
        this.health += Math.floor(val * (this.health / this.maxHealth) / this.maxHealth);
        this.maxHealth += Math.floor(val / this.maxHealth);
        this.radius += Math.sqrt(val) / this.radius; // Increase size based on absorbed health
        this.level = this.health;
        list.splice(index, 1); // Remove swallowed enemy
    }

    draw(ctx) {
        // Draw the spiky circle
        ctx.fillStyle = 'purple'; // Color for spiky enemy
        ctx.beginPath();
        for (let i = 0; i < Math.floor(this.radius * (1 + this.health / this.maxHealth)); i++) {
            const angle = (i / Math.floor(this.radius * (1 + this.health / this.maxHealth))) * Math.PI * 2;
            const spikeLength = i % 2 === 0 ? this.radius * (1 + this.health / this.maxHealth)  : this.radius * (1 + this.health / this.maxHealth) + 5;
            const x = this.x + Math.cos(angle) * spikeLength;
            const y = this.y + Math.sin(angle) * spikeLength;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        this.drawHealthBar(ctx);
    }
}

class XPObject {
    constructor(x, y, amount) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.vx = 0; // Velocity in the x direction
        this.vy = 0; // Velocity in the y direction
    }

    getColor() {
        const minXP = 1;
        const maxXP = 100;

        const logMin = Math.log(minXP);
        const logMax = Math.log(maxXP);
        const logAmount = Math.log(Math.max(minXP, this.amount));

        const factor = (logAmount - logMin) / (logMax - logMin);

        const startColor = { r: 0, g: 64, b: 0 };
        const endColor = { r: 0, g: 255, b: 0 };

        const r = Math.round(startColor.r + factor * (endColor.r - startColor.r));
        const g = Math.round(startColor.g + factor * (endColor.g - startColor.g));
        const b = Math.round(startColor.b + factor * (endColor.b - startColor.b));

        return `rgb(${r}, ${g}, ${b})`;
    }

    update(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const maxRange = player.upgrades.xpGravitationRange;
        const dragFactor = 0.995; // Factor to reduce velocity when out of range

        if (distance <= maxRange) {
            // Within gravity range, apply gravitational pull
            const speedFactor = (maxRange - distance) / maxRange;
            const pull = player.upgrades.xpGravitationSpeed * speedFactor;

            const directionX = dx / distance;
            const directionY = dy / distance;

            this.vx += directionX * pull;
            this.vy += directionY * pull;
        } else {
            // Outside gravity range, apply drag
            this.vx *= dragFactor;
            this.vy *= dragFactor;
        }

        if (this.x < player.x - player.worldSize) this.x += player.worldSize * 2;
        if (this.x > player.x + player.worldSize) this.x -= player.worldSize * 2;
        if (this.y < player.y - player.worldSize) this.y += player.worldSize * 2;
        if (this.y > player.y + player.worldSize) this.y -= player.worldSize * 2;

        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        // Draw the main XP orb
        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw the glow effect if amount exceeds maxXP
        const maxXP = 100;
        if (this.amount > maxXP) {
            const excessXP = this.amount - maxXP;
            const glowIntensity = Math.min(0.5, excessXP / 100 * 0.1); // Cap the intensity at 0.5 for visibility

            ctx.fillStyle = `rgba(255, 255, 255, ${glowIntensity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 7, 0, Math.PI * (Math.log2(Math.sqrt(excessXP/5)))); // Slightly larger radius for the glow
            ctx.arc(this.x, this.y, 7, 0, Math.PI * (Math.log2(Math.sqrt(excessXP/5))) / 2); // Slightly larger radius for the glow
            ctx.fill();
        }
    }
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Create an audio context
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));

        this.uiManager = new UIManager(this.canvas);

        this.stats = {
            gamesPlayed: 0,
            totalEnemiesDefeated: 0,
            totalXPCollected: 0,
            totalUpgradesChosen: 0,
            totalShotsFired: 0,
            totalTimePlayed: 0,
            bestRun: {
                duration: 0,
                level: 0,
                xp: 0,
                upgrades: {}
            },
            lastRun: { // New property for last run stats
                duration: 0,
                level: 0,
                xp: 0,
                upgrades: {}
            }
        };

        this.loadStats();

        this.currentMenu = 'main'; // Track the current menu
        this.setupMainMenu();

        this.gameRunning = false;
        this.worldSize = 1000;
        this.player = new Player(0, 0, this.worldSize);
        this.canSelectUpgrade = false;
        this.chosenUpgrades = [];
        this.projectiles = [];
        this.enemies = [];
        this.xpObjects = [];
        this.lastShotTime = 0;
        this.lastSpawnTime = 0;
        this.spawnInterval = 2000;
        this.keysPressed = {};
        this.startTime = 0;
        this.level = 1;
        this.elapsedTime = 0;
        this.lastFrameTime = 0;
        this.upgradeHistory = [];

        this.hueShift = 0;

        this.isPaused = false; // Track if the game is paused
        this.setupEventListeners();
    }

    playSound(frequency, type = 'sine', duration = 0.5) {
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    loadStats() {
        const savedStats = localStorage.getItem('gameStats');
        if (savedStats) {
            this.stats = JSON.parse(savedStats);

            // Ensure bestRun and lastRun are initialized if not present in saved stats
            if (!this.stats.bestRun) {
                this.stats.bestRun = {
                    duration: 0,
                    level: 0,
                    xp: 0,
                    upgrades: {}
                };
            }
            if (!this.stats.lastRun) {
                this.stats.lastRun = {
                    duration: 0,
                    level: 0,
                    xp: 0,
                    upgrades: {}
                };
            }
        }
    }

    saveStats() {
        localStorage.setItem('gameStats', JSON.stringify(this.stats));
    }

    setupMainMenu() {
        this.uiManager.panels = []; // Clear existing panels
        const mainMenuPanel = new UIPanel(100, 100, 300, 400);
        const playButton = new UIButton(150, 150, 200, 50, 'Play', () => {
            console.log('Play button clicked'); // Debug log
            this.startGame();
        });
        const statsButton = new UIButton(150, 220, 200, 50, 'Stats', () => {
            console.log('Stats button clicked'); // Debug log
            this.displayStatsMenu();
        });

        mainMenuPanel.addChild(playButton);
        mainMenuPanel.addChild(statsButton);
        this.uiManager.addPanel(mainMenuPanel);
        this.uiManager.draw(); // Ensure UI is drawn
    }
    
    setupStatsMenu() {
        this.uiManager.panels = []; // Clear existing panels
        const statsPanel = new UIPanel(50, 50, this.canvas.width - 100, this.canvas.height - 100);
        
        const statsText = [
            `Games Played: ${simplifyNumber(this.stats.gamesPlayed)}`,
            `Total Enemies Defeated: ${simplifyNumber(this.stats.totalEnemiesDefeated)}`,
            `Total XP Collected: ${simplifyNumber(this.stats.totalXPCollected)}`,
            `Total Upgrades Chosen: ${simplifyNumber(this.stats.totalUpgradesChosen)}`,
            `Total Shots Fired: ${simplifyNumber(this.stats.totalShotsFired)}`,
            (() => {
                const totalSeconds = this.stats.totalTimePlayed;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                return `Total Time Played: ${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
            })(),
        ]
            

        statsText.forEach((text, index) => {
            const statText = new UIElement(100, 100 + index * 40, 0, 0);
            statText.draw = (ctx) => {
                ctx.fillStyle = 'white';
                ctx.font = '24px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(text, statText.x, statText.y);
            };
            statsPanel.addChild(statText);
        });

        // Create a panel for the best run stats
        const lines = Object.keys(game.stats.bestRun).length + Object.keys(game.stats.bestRun.upgrades).length - 2;
        const height = lines * 30 + 25;
        const bestRunPanel = new UIPanel(100, 360, 300, height);
        bestRunPanel.draw = (ctx) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Dark background
            ctx.fillRect(bestRunPanel.x, bestRunPanel.y, bestRunPanel.width, bestRunPanel.height);

            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';

            const bestRunStats = [
                `Duration: ${simplifyNumber(Math.floor(this.stats.bestRun.duration / 60))}m ${simplifyNumber(Math.round(this.stats.bestRun.duration % 60))}s`,
                `Level: [${this.stats.bestRun.level}] (${this.stats.bestRun.xp}/${this.player.xpToNextLevel})`
            ];

            let yOffset = 25;
            for (const [key, value] of Object.entries(this.stats.bestRun.upgrades)) {
                bestRunStats.push(`${key}: ${simplifyNumber(value)}`);
            }

            bestRunStats.forEach((text, index) => {
                ctx.fillText(text, bestRunPanel.x + 10, bestRunPanel.y + yOffset + index * 30);
            });
        };

        statsPanel.addChild(bestRunPanel);

        // Create a panel for the last run stats
        const lastRunPanel = new UIPanel(450, 360, 300, height);
        lastRunPanel.draw = (ctx) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Dark background
            ctx.fillRect(lastRunPanel.x, lastRunPanel.y, lastRunPanel.width, lastRunPanel.height);

            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';

            const lastRunStats = [
                `Duration: ${simplifyNumber(Math.floor(this.stats.lastRun.duration / 60))}m ${simplifyNumber(Math.round(this.stats.lastRun.duration % 60))}s`,
                `Level: [${this.stats.lastRun.level}] (${this.stats.lastRun.xp}/${this.player.xpToNextLevel})`
            ];

            let yOffset = 25;
            for (const [key, value] of Object.entries(this.stats.lastRun.upgrades)) {
                lastRunStats.push(`${key}: ${simplifyNumber(value)}`);
            }

            lastRunStats.forEach((text, index) => {
                ctx.fillText(text, lastRunPanel.x + 10, lastRunPanel.y + yOffset + index * 30);
            });
        };

        statsPanel.addChild(lastRunPanel);

        const backButton = new UIButton(100, this.canvas.height - 60, 200, 50, 'Back', () => {
            this.setupMainMenu();
        });

        statsPanel.addChild(backButton);
        this.uiManager.addPanel(statsPanel);
        this.uiManager.draw(); // Ensure UI is drawn
    }

    displayStatsMenu() {
        this.currentMenu = 'stats'; // Set current menu to stats
        this.setupStatsMenu();
    }

    setupPauseMenu() {
        this.uiManager.panels = []; // Clear existing panels

        // Create the pause menu panel
        const pauseMenuPanel = new UIPanel(50, 50, 200, this.canvas.height - 100);
        const resumeButton = new UIButton(75, 100, 150, 50, 'Resume', () => {
            this.togglePause();
            this.isPaused = false;
        });
        const quitButton = new UIButton(75, 170, 150, 50, 'Quit', () => {
            this.gameRunning = false;
            this.isPaused = false;
            this.setupMainMenu();
        });

        pauseMenuPanel.addChild(resumeButton);
        pauseMenuPanel.addChild(quitButton);
        this.uiManager.addPanel(pauseMenuPanel);

        // Create the run stats panel
        const statsPanel = new UIPanel(this.canvas.width - 350, 50, 300, this.canvas.height - 100);
        const runStats = [
            `Duration: ${simplifyNumber(Math.floor(this.elapsedTime / 60))}m ${simplifyNumber(Math.round(this.elapsedTime % 60))}s`,
            `Level: [${this.player.level}] (${this.player.xp}/${this.player.xpToNextLevel})`
        ];

        runStats.forEach((text, index) => {
            const statText = new UIElement(this.canvas.width - 350, 100 + index * 40, 0, 0);
            statText.draw = (ctx) => {
                ctx.fillStyle = 'white';
                ctx.font = '24px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(text, statText.x, statText.y);
            };
            statsPanel.addChild(statText);
        });

        // Add player's current upgrades to the stats panel
        let yOffset = 200; // Start below the run stats
        let xOffset = this.canvas.width - 340;
        for (const [key, value] of Object.entries(this.player.upgrades)) {
            const upgradeText = new UIElement(xOffset, yOffset, 0, 0);
            upgradeText.draw = (ctx) => {
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`${key}: ${simplifyNumber(value)}`, upgradeText.x, upgradeText.y);
            };
            statsPanel.addChild(upgradeText);
            yOffset += 30; // Space between each upgrade
        }

        this.uiManager.addPanel(statsPanel);
        this.uiManager.draw(false, false); // Draw without background
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.setupPauseMenu();
        } else {
            this.uiManager.panels = []; // Clear pause menu
            this.gameRunning = true;
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    startGame() {
        this.currentMenu = 'game'; // Set current menu to game
        this.player = new Player(10000, 10000);
        this.projectiles = [];
        this.enemies = [];
        this.xpObjects = [];
        this.upgradeHistory = [];
        this.gameRunning = true;
        this.startTime = performance.now();
        this.level = 1;
        this.elapsedTime = 0;
        this.spawnInterval = 2000;
        this.uiManager.panels = []; // Clear UI panels
        this.gameLoop(this.startTime);
    }

    gameLoop(timestamp) {
        const timeSinceLastFrame = timestamp - this.lastFrameTime;
        this.stats.totalTimePlayed += (timestamp - this.lastFrameTime) / 1000;

        if (this.isPaused) {
            return;
        }

        if (!this.gameRunning) {
            const currentRunDuration = (timestamp - this.startTime) / 1000;
            if (currentRunDuration > this.stats.bestRun.duration) {
                this.stats.bestRun.duration = currentRunDuration;
                this.stats.bestRun.level = this.player.level;
                this.stats.bestRun.xp = this.player.xp;
                this.stats.bestRun.upgrades = { ...this.player.upgrades };
            }
            this.stats.lastRun.duration = currentRunDuration;
            this.stats.lastRun.level = this.player.level;
            this.stats.lastRun.xp = this.player.xp;
            this.stats.lastRun.upgrades = { ...this.player.upgrades };
            return;
        }

        this.elapsedTime += 1 / 120;
        const levelTime = Math.floor(this.elapsedTime / 60) + 1;
        if (levelTime > this.level) {
            this.level = levelTime;
            this.spawnInterval = Math.max(250, this.spawnInterval / 1.15);
            if (this.level >= 10 && this.level % 5) {
                game.spawnSpikyEnemy(this.level);
            }
        }

        if (timeSinceLastFrame < 1000 / 60) {
            requestAnimationFrame(this.gameLoop.bind(this));
            return;
        }

        this.lastFrameTime = timestamp;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // TODO: Add option to enable / disable this
        // Apply hue shift if difficulty is greater than 5
        // if (this.level > 5) {
        //     this.hueShift = (this.hueShift + (this.level - 5) * 0.05) % 360; // Adjust the multiplier for speed
        //     this.ctx.filter = `hue-rotate(${this.hueShift}deg)`;
        // } else {
        //     this.ctx.filter = 'none';
        // }

        let darkness = Math.max(255 - this.level * 10, 0);
        this.ctx.fillStyle = `rgb(${darkness},${darkness},${darkness})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2 - this.player.x, this.canvas.height / 2 - this.player.y);

        const gamepad = navigator.getGamepads()[0];
        this.player.move(this.keysPressed, gamepad);
        this.player.draw(this.ctx);

        // Regenerate health
        this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.upgrades.healthRegen * (timeSinceLastFrame / 1000));

        this.projectiles.forEach((projectile, pIndex) => {
            projectile.update();
            projectile.draw(this.ctx);

            this.enemies.forEach((enemy, eIndex) => {
                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.player.upgrades.bulletSize + 15 && !projectile.hitEnemies.has(enemy)) {
                    enemy.health -= this.player.upgrades.bulletDamage;
                    projectile.hitEnemies.add(enemy);
                    projectile.hitCount++;

                    const velocity = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
                    //this.playSoundBasedOnVelocity(velocity);

                    if (enemy.health <= 0) {
                        this.handleEnemyDestruction(eIndex);
                    }

                    if (projectile.hitCount >= this.player.upgrades.bulletPenetration) {
                        this.projectiles.splice(pIndex, 1);
                    }
                }
            });

            if (projectile.vx == 0 && projectile.vy == 0) this.projectiles.splice(pIndex, 1)        
            if (projectile.x < this.player.x - this.worldSize) this.projectiles.splice(pIndex, 1);
            if (projectile.x > this.player.x + this.worldSize) this.projectiles.splice(pIndex, 1);
            if (projectile.y < this.player.y - this.worldSize) this.projectiles.splice(pIndex, 1);
            if (projectile.y > this.player.y + this.worldSize) this.projectiles.splice(pIndex, 1);
        });

        this.updateAndDrawXPObjects();

        this.shootProjectile(timestamp);

        if (timestamp - this.lastSpawnTime > this.spawnInterval) {
            this.spawnEnemy(this.level);
            this.spawnRandomXP(this.level);
            this.lastSpawnTime = timestamp;
        }

        this.enemies.forEach((enemy, index) => {
            enemy.update(this.player, this.enemies, this.xpObjects);
            enemy.draw(this.ctx);

            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.player.size / 2 + 15 && !this.canSelectUpgrade) { // add support for the spikies
                this.player.health -= enemy.level * (timeSinceLastFrame / 1000);

                if (this.player.health <= 0) {
                    this.gameRunning = false;
                    this.stats.gamesPlayed++;
                    this.saveStats();
                    this.uiManager.panels = [];
                    this.setupMainMenu();
                    this.uiManager.draw();
                }
            }
        });

        this.ctx.restore();

        this.drawProgressBar(this.elapsedTime);
        this.drawUpgradeHistory();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    shootProjectile(timestamp) {
        if (timestamp - this.lastShotTime > this.player.upgrades.fireRate) {
            const playerVelocity = this.player.getVelocity();
            const bulletVx = Math.cos(this.player.angle) * this.player.upgrades.bulletSpeed + playerVelocity.vx / 5;
            const bulletVy = Math.sin(this.player.angle) * this.player.upgrades.bulletSpeed + playerVelocity.vy / 5;
            this.projectiles.push(new Projectile(this.player.x, this.player.y, bulletVx, bulletVy));
            this.lastShotTime = timestamp;
            this.trackShotFired();
        }
    }

    playSoundBasedOnVelocity(velocity) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        // Map velocity to frequency (e.g., higher velocity = higher pitch)
        const frequency = 200 + velocity * 10; // Adjust the multiplier as needed
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        // Map velocity to volume (e.g., higher velocity = louder sound)
        const volume = Math.min(1, velocity / 100); // Ensure volume is between 0 and 1
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1); // Short duration for impact sound
    }

    handleEnemyDestruction(enemyIndex) {
        const enemy = this.enemies[enemyIndex];
        
        if (enemy instanceof SpikyEnemy) {
            const sqrtHealth = Math.sqrt(enemy.health);
            const numXPOrbs = Math.floor(sqrtHealth);
            const xpAmount = Math.floor(sqrtHealth);

            for (let i = 0; i < numXPOrbs; i++) {
                const angle = Math.random() * Math.PI * 2;
                const velocityMagnitude = Math.random() * sqrtHealth;
                const vx = Math.cos(angle) * velocityMagnitude;
                const vy = Math.sin(angle) * velocityMagnitude;

                const xpOrb = new XPObject(enemy.x, enemy.y, xpAmount);
                xpOrb.vx = vx;
                xpOrb.vy = vy;

                console.log("orb: " + i)
                console.log(xpOrb)
                xpOrb.x += xpOrb.vx * 3;
                xpOrb.y += xpOrb.vy * 3;

                this.xpObjects.push(xpOrb);
                console.log(xpOrb)
            }
        } else {
            const xpDrop = Math.floor(enemy.level * this.player.upgrades.xpDropRate + Math.random() * 2);
            this.xpObjects.push(new XPObject(enemy.x, enemy.y, xpDrop));
        }
     
        this.enemies.splice(enemyIndex, 1);
        this.stats.totalEnemiesDefeated++; // Increment enemies defeated

        if (enemy.level > 1 && Math.random() > 0.33) {
            this.spawnEnemy(enemy.level - 1);
        } else if (Math.random() > 0.5) {
            this.spawnEnemy(enemy.level);
        }
    }

    updateAndDrawXPObjects() {
        for (let i = 0; i < this.xpObjects.length; i++) {
            const xp1 = this.xpObjects[i];
            xp1.update(this.player);

            for (let j = i + 1; j < this.xpObjects.length; j++) {
                const xp2 = this.xpObjects[j];

                // Calculate distance between two XP objects
                const dx = xp1.x - xp2.x;
                const dy = xp1.y - xp2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if they are touching (assuming a radius of 5 for each orb)
                if (distance < 20) {
                    // Absorb xp2 into xp1
                    xp1.vx = (xp1.vx + xp2.vx) / 2;
                    xp1.vy = (xp1.vy + xp2.vy) / 2;
                    xp1.amount = Math.ceil((xp1.amount + xp2.amount) * 1.15);

                    // Remove xp2 from the array
                    this.xpObjects.splice(j, 1);
                    j--; // Adjust index after removal
                }
            }

            // Check if the player is within the pickup range
            const dx = this.player.x - xp1.x;
            const dy = this.player.y - xp1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.player.upgrades.pickupRange) {
                this.player.xp += xp1.amount;
                this.stats.totalXPCollected += xp1.amount;
                this.xpObjects.splice(i, 1);
                i--; // Adjust index after removal

                if (this.player.xp >= this.player.xpToNextLevel) {
                    this.levelUp();
                }
            }

            xp1.draw(this.ctx);
        }
    }

    spawnEnemy(level) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 1000;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const health = 1 + level;
        this.enemies.push(new Enemy(x, y, Math.log2(level / 2 + 1), health, level));

        while (this.enemies >= 1500) {
            this.enemies.shift();
        }
    }

    spawnSpikyEnemy(level) {
        const fixedLevel = Math.floor(1 + (level - 10) / 5);
        const angle = Math.random() * Math.PI * 2;
        const distance = 1000;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const health = 100 * fixedLevel;
        this.enemies.push(new SpikyEnemy(x, y, 2, health, 5, fixedLevel * 5));
    }

    spawnRandomXP(scale) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 100 + 50;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
    
        let amount = 1; // Start with a base amount of 1
        let probability = 0.5; // Initial probability to add 1
    
        // Increase the chance to add more XP based on the scale
        while (Math.random() < probability) {
            amount += 1;
            probability *= 0.5 + (scale / 100); // Increase probability with scale

            if (amount >= 100) {
                break;
            }
        }
    
        this.xpObjects.push(new XPObject(x, y, amount));
    }

    drawProgressBar(elapsedTime) {
        this.ctx.fillStyle = 'gray';
        this.ctx.fillRect(10, 10, this.canvas.width - 20, 20);
        this.ctx.fillStyle = 'red';
        const progressWidth = ((elapsedTime % 60) / 60) * (this.canvas.width - 20);
        this.ctx.fillRect(10, 10, progressWidth, 20);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Difficulty: ${this.level}`, (this.canvas.width - 20) / 2, 25);

        this.drawXPBar();
    }

    drawXPBar() {
        const barWidth = this.canvas.width - 20;
        const barHeight = 20;
        const barX = 10;
        const barY = this.canvas.height - barHeight - 10;

        this.ctx.fillStyle = 'gray';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        const filledWidth = (this.player.xp / this.player.xpToNextLevel) * barWidth;

        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(barX, barY, filledWidth, barHeight);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`[${this.player.level}] XP: ${this.player.xp}/${this.player.xpToNextLevel}`, barX + barWidth / 2, barY + barHeight - 5);
    }

    levelUp() {
        this.player.level++;
        this.player.xp -= this.player.xpToNextLevel;
        this.player.xpToNextLevel += 10 
            + Math.floor(this.player.level / 10) 
            + Math.pow(
                Math.floor(this.player.level / 50) * 10, 
                Math.pow(
                    Math.floor(this.player.level / 100) + 1, 
                    Math.floor(this.player.level / 200)
                )
            );

        const upgrades = this.player.getAvailableUpgrades(); // Get available upgrades dynamically
        this.chosenUpgrades = []; // Reset chosen upgrades
        while (this.chosenUpgrades.length < Math.floor(this.player.upgrades.upgradeCount)) {
            const randomUpgrade = upgrades[Math.floor(Math.random() * upgrades.length)];
            if (!this.chosenUpgrades.includes(randomUpgrade)) {
                this.chosenUpgrades.push(randomUpgrade);
            }
        }
        this.canSelectUpgrade = true;
        this.displayUpgradeOptions(this.chosenUpgrades);

        window.addEventListener('keydown', this.selectUpgrade.bind(this)); // Use bind to ensure correct context
    }

    //This seems to work, but only after I move my cursor and for some reason that updates the position? also if the game is playing for the ui please don't draw the white background
    displayUpgradeOptions(upgrades) {
        this.uiManager.panels = []; // Clear existing panels
    
        // Center the upgrade panel on the screen
        const panelWidth = 300;
        const panelHeight = upgrades.length * 60 + 40;
        const panelX = (this.canvas.width - panelWidth) / 2;
        const panelY = (this.canvas.height - panelHeight) / 2;
    
        const upgradePanel = new UIPanel(panelX, panelY, panelWidth, panelHeight);
        
        upgrades.forEach((upgrade, index) => {
            const buttonWidth = 200;
            const buttonHeight = 50;
            const buttonX = (this.canvas.width - buttonWidth) / 2;
            const buttonY = panelY + 20 + index * 60;
    
            const upgradeButton = new UIButton(
                buttonX, 
                buttonY, 
                buttonWidth, 
                buttonHeight, 
                `Upgrade ${index + 1}: ${upgrade}`, 
                () => {
                    this.applyUpgrade(upgrade);
                    this.canSelectUpgrade = false; // Set canSelectUpgrade to false
                    this.uiManager.panels = []; // Clear the upgrade panel
                    this.gameRunning = true; // Resume the game
                    requestAnimationFrame(this.gameLoop.bind(this));
                }
            );
            upgradePanel.addChild(upgradeButton);
        });
    
        this.uiManager.addPanel(upgradePanel);
        this.uiManager.draw(false, false); // Ensure UI is drawn immediately without background
        this.gameRunning = false; // Pause the game while selecting upgrades
    }

    selectUpgrade(event) {
        if (event.key >= '1' && event.key <= `${Math.floor(this.player.upgrades.upgradeCount)}` && this.canSelectUpgrade) {
            window.removeEventListener('keydown', this.selectUpgrade.bind(this)); // Ensure correct context
            this.canSelectUpgrade = false;
            const selectedUpgrade = this.chosenUpgrades[event.key - 1]; // Access chosenUpgrades from the class property
            this.applyUpgrade(selectedUpgrade);
            this.gameRunning = true;
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    applyUpgrade(upgrade) {
        const upgradeResult = this.player.applyUpgrade(upgrade);
        if (upgradeResult) {
            this.stats.totalUpgradesChosen++;
            this.upgradeHistory.push(upgradeResult);
            if (this.upgradeHistory.length > 10) {
                this.upgradeHistory.shift();
            }
        }
    }

    trackShotFired() {
        this.stats.totalShotsFired++;
    }

    drawUpgradeHistory() {
        const startX = this.canvas.width - 20; // Adjusted for more space
        const startY = this.canvas.height - 250; // Start from the top of the box
        const lineHeight = 20;
        const boxWidth = 180; // Width of the background box
        const boxHeight = lineHeight * 10 + 10; // Height to fit 10 lines with padding
    
        // Draw the background box
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Set the background to black
        this.ctx.fillRect(startX - boxWidth, startY, boxWidth, boxHeight);
    
        // Draw each upgrade with increasing opacity, starting from the top
        const historyLength = this.upgradeHistory.length;
        for (let i = 0; i < historyLength; i++) {
            const opacity = (i + 1) / historyLength; // Calculate opacity based on position
            this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'right';
    
            // Display the upgrade history directly
            const upgradeText = this.upgradeHistory[i];
            this.ctx.fillText(upgradeText, startX - 10, startY + i * lineHeight + 15);
        }
    }

    setupEventListeners() {
        window.addEventListener('keydown', (event) => {
            this.keysPressed[event.key] = true;
            if (!this.gameRunning) {
                if (event.key === 'ArrowUp') {
                    this.selectedOption = (this.selectedOption - 1 + this.menuOptions.length) % this.menuOptions.length;
                    this.uiManager.draw();
                } else if (event.key === 'ArrowDown') {
                    this.selectedOption = (this.selectedOption + 1) % this.menuOptions.length;
                    this.uiManager.draw();
                } else if (event.key === 'Enter') {
                    this.handleMenuSelection();
                }
            }
            if (event.key === 'Escape' && this.gameRunning) {
                this.togglePause();
            }
        });
    
        window.addEventListener('keyup', (event) => {
            this.keysPressed[event.key] = false;
        });

        this.canvas.addEventListener('mousemove', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            this.player.angle = Math.atan2(mouseY - this.canvas.height / 2, mouseX - this.canvas.width / 2);
        });
    }
}



function simplifyNumber(num) {
    if (num >= 1e6) {
        return (num / 1e6).toFixed(1) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(1) + 'k';
    } else if (num >= 1) {
        return num.toFixed(2);
    } else {
        return num.toExponential(2);
    }
}

const game = new Game('gameCanvas');