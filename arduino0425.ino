const int potPin = A1; // 可變電阻接到 A1 腳位

void setup() {
  Serial.begin(9600); // 初始化串口通信
}

void loop() {
  int potValue = analogRead(potPin); // 讀取可變電阻的值 (0-1023)
  Serial.println(potValue); // 將數值發送到串口
  delay(50); // 延遲 50 毫秒，避免數據過於頻繁
}
