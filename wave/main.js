document.addEventListener('DOMContentLoaded', function() {
    console.log('波浪動畫已載入');

    // 設定黑色背景
    document.body.style.backgroundColor = '#000';

    // 建立 canvas
    let canvas = document.getElementById('waveCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveCanvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    // 設定 canvas 大小
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 初始化波浪參數
    const waves = Array.from({ length: Math.floor(canvas.height / 20) }, (_, i) => ({
        amplitude: 25,
        frequency: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        verticalOffset: i * 20
    }));

    let potValue = 0;
    let currentPort = null;
    let currentReader = null;
    let isConnecting = false;

    // Arduino 連接函數
    window.connectToArduino = async function connectToArduino() {
        if (isConnecting) {
            alert('正在連接中，請稍候...');
            return;
        }

        isConnecting = true;

        try {
            // 關閉現有連接
            if (currentReader) {
                await currentReader.cancel();
                currentReader = null;
            }
            if (currentPort) {
                await currentPort.close();
                currentPort = null;
            }

            // 建立新連接
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            currentPort = port;

            const reader = port.readable.getReader();
            currentReader = reader;
            console.log('已連接到 Arduino');

            // 讀取數據
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                if (value) {
                    const data = new TextDecoder().decode(value).trim();
                    if (data) {
                        const newValue = parseInt(data, 10);
                        if (!isNaN(newValue) && newValue >= 0 && newValue <= 1023) {
                            potValue = newValue;
                            console.log('電阻值更新為:', potValue);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Arduino 連接錯誤:', error);
            alert('連接失敗，請確認:\n1. Arduino 已連接\n2. 已上傳正確程式\n3. 選擇正確的串口');
        } finally {
            isConnecting = false;
        }
    };

    // 繪製波浪
    function drawWaves() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 計算波浪速度 (0.005 到 0.1)
        const waveSpeed = 0.005 + (potValue / 1023) * 0.095;

        waves.forEach((wave, index) => {
            wave.phase += waveSpeed;

            // 繪製波浪線
            ctx.beginPath();
            ctx.strokeStyle = `hsl(${200 + index * 10}, 70%, 50%)`;
            ctx.lineWidth = 2;

            for (let x = 0; x < canvas.width; x += 2) {
                const y = wave.verticalOffset + 
                    Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
        });

        requestAnimationFrame(drawWaves);
    }

    drawWaves();
});