document.addEventListener('DOMContentLoaded', function() {
    console.log('全畫面波浪動畫已載入！');

    // Set background to dark color
    document.body.style.backgroundColor = '#000';

    // 建立 canvas 元素並插入 body
    let canvas = document.getElementById('waveCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveCanvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const waves = Array.from({ length: Math.floor(canvas.height / 20) }, (_, i) => ({
        amplitude: 15,
        frequency: 0.005 + Math.random() * 0.01,
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        verticalOffset: i * 20
    }));

    let currentShape = 'circle'; // Default shape
    let potValue = 0; // Default potentiometer value
    let invalidDataCount = 0; // Counter for invalid data
    let emptyDataCount = 0; // Counter for empty data
    let lastValidValue = null; // Track the last valid value

    // Make connectToArduino globally accessible
    window.connectToArduino = async function connectToArduino() {
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });

            const reader = port.readable.getReader();

            // 非阻塞式讀取資料
            const readArduinoData = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            console.log("Arduino connection closed.");
                            break;
                        }
                        const data = new TextDecoder().decode(value).trim();

                        // Ignore empty data and log the count
                        if (data === "") {
                            emptyDataCount++;
                            console.warn(`Received empty data from Arduino (${emptyDataCount} times).`);
                            continue; // Skip empty data
                        }

                        // Limit data update frequency to avoid excessive updates
                        const currentTime = Date.now();
                        if (currentTime - lastUpdateTime < 100) {
                            continue; // Skip updates that are too frequent
                        }
                        lastUpdateTime = currentTime;

                        if (/^\d+$/.test(data)) { // Check if the data is a valid number
                            const parsedValue = parseInt(data, 10);

                            // Filter out duplicate data
                            if (parsedValue === lastValidValue) {
                                continue; // Skip duplicate data
                            }

                            lastValidValue = parsedValue; // Update the last valid value

                            potValue = Math.max(0, Math.min(1023, parsedValue)); // Clamp the value between 0 and 1023
                        } else {
                            invalidDataCount++;
                            console.warn(`Received invalid data from Arduino (${invalidDataCount}):`, data); // Log invalid data
                        }
                    }
                } catch (error) {
                    console.error("Error reading from Arduino:", error);
                }
            };

            readArduinoData(); // 啟動非阻塞式資料讀取
        } catch (error) {
            console.error("Error connecting to Arduino:", error);
        }
    };

    // Remove duplicate button creation logic
    const existingButton = document.querySelector('button');
    if (!existingButton) {
        const connectButton = document.createElement('button');
        connectButton.textContent = '連接 Arduino';
        connectButton.style.position = 'absolute';
        connectButton.style.top = '10px';
        connectButton.style.left = '10px';
        connectButton.style.zIndex = '1000';
        document.body.appendChild(connectButton);

        connectButton.addEventListener('click', connectToArduino);
    }

    function drawShape(x, y, size) {
        ctx.beginPath();
        if (currentShape === 'circle') {
            ctx.arc(x, y, size + 1, 0, Math.PI * 2); // Increased size slightly
        } else if (currentShape === 'triangle') {
            ctx.moveTo(x, y - (size + 1));
            ctx.lineTo(x - (size + 1), y + (size + 1));
            ctx.lineTo(x + (size + 1), y + (size + 1));
            ctx.closePath();
        } else if (currentShape === 'square') {
            ctx.rect(x - (size + 1), y - (size + 1), (size + 1) * 2, (size + 1) * 2);
        }
        ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 70%)`; // Set points to glowing colors
        ctx.shadowColor = ctx.fillStyle; // Add glow effect
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow blur for other elements
    }

    // Add a fallback mechanism to ensure drawWaves continues
    let lastUpdateTime = Date.now();

    function drawWaves() {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastUpdateTime;
        lastUpdateTime = currentTime;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Clamp potValue to a valid range
        potValue = Math.max(0, Math.min(1023, potValue));

        // Prevent disappearance by ensuring valid wave speed
        waves.forEach((wave) => {
            wave.speed = 0.005 + (potValue / 1023) * 0.05;
            wave.speed = Math.max(0.005, wave.speed);
        });

        waves.forEach((wave, waveIndex) => {
            wave.phase += wave.speed * (deltaTime / 16.67); // Adjust for frame time

            const gradient = ctx.createLinearGradient(0, wave.verticalOffset - wave.amplitude, 0, wave.verticalOffset + wave.amplitude);
            gradient.addColorStop(0, 'hsl(200, 100%, 70%)');
            gradient.addColorStop(1, 'hsl(200, 100%, 50%)');

            ctx.beginPath();
            for (let x = 0; x < canvas.width; x += 2) {
                const y = wave.verticalOffset + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                ctx.lineTo(x, y);
            }
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();

            const pointSpacing = Math.floor(canvas.width / 10);
            for (let i = 0; i <= 10; i++) {
                const x = i * pointSpacing + (waveIndex * 15) % pointSpacing;
                const y = wave.verticalOffset + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                drawShape(x, y, 2);
            }
        });

        requestAnimationFrame(drawWaves); // Ensure the animation loop continues
    }

    drawWaves();
});