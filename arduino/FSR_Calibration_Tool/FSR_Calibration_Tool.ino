/*
 * FSR Calibration Tool for ESP32
 * 
 * Use this sketch to find the optimal threshold value for your FSR sensor.
 * This will help you determine the right trigger point for detecting inhaler presses.
 * 
 * HARDWARE SETUP:
 * Same as main project:
 * 3.3V → FSR → GPIO34 → 10kΩ resistor → GND
 * 
 * INSTRUCTIONS:
 * 1. Upload this sketch to your ESP32
 * 2. Open Serial Monitor (115200 baud)
 * 3. Observe readings WITHOUT pressing FSR (baseline)
 * 4. Press FSR gently, medium, and hard - observe max values
 * 5. Calculate threshold: Set to 50-70% of pressed value
 * 6. Use this threshold in main sketch
 */

// FSR Configuration
const int fsrPin = 34;  // GPIO34 (ADC1_CH6)

// Calibration variables
int minValue = 4095;    // Minimum value observed (no pressure)
int maxValue = 0;       // Maximum value observed (full pressure)
int currentValue = 0;   // Current reading

// Running statistics
unsigned long readingCount = 0;
float averageValue = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(fsrPin, INPUT);
  
  Serial.println("\n\n");
  Serial.println("========================================");
  Serial.println("   FSR CALIBRATION TOOL - ESP32");
  Serial.println("========================================");
  Serial.println();
  Serial.println("Pin Configuration:");
  Serial.println("  - FSR Pin: GPIO" + String(fsrPin));
  Serial.println("  - ADC Resolution: 12-bit (0-4095)");
  Serial.println();
  Serial.println("Instructions:");
  Serial.println("  1. Don't touch FSR - observe baseline values");
  Serial.println("  2. Press FSR lightly - observe values");
  Serial.println("  3. Press FSR medium - observe values");
  Serial.println("  4. Press FSR hard - observe max values");
  Serial.println("  5. Use recommended threshold shown below");
  Serial.println();
  Serial.println("========================================");
  Serial.println("Starting calibration in 3 seconds...");
  Serial.println("========================================\n");
  
  delay(3000);
}

void loop() {
  // Read FSR value
  currentValue = analogRead(fsrPin);
  
  // Update statistics
  readingCount++;
  averageValue = ((averageValue * (readingCount - 1)) + currentValue) / readingCount;
  
  // Update min/max
  if (currentValue < minValue) minValue = currentValue;
  if (currentValue > maxValue) maxValue = currentValue;
  
  // Clear screen and print header (every 20 readings)
  if (readingCount % 20 == 1) {
    Serial.println("\n========================================");
    Serial.println("         LIVE FSR READINGS");
    Serial.println("========================================");
  }
  
  // Print current reading with visual bar
  Serial.print("[");
  Serial.print(String(readingCount).substring(0, 6));
  Serial.print("] Value: ");
  
  // Format value with leading spaces for alignment
  if (currentValue < 1000) Serial.print(" ");
  if (currentValue < 100) Serial.print(" ");
  if (currentValue < 10) Serial.print(" ");
  Serial.print(currentValue);
  
  // Visual bar graph
  Serial.print(" | ");
  int barLength = map(currentValue, 0, 4095, 0, 40);
  for (int i = 0; i < barLength; i++) {
    Serial.print("█");
  }
  
  // Status indicator
  Serial.print(" ");
  if (currentValue < 100) {
    Serial.print("[NO PRESSURE]");
  } else if (currentValue < 300) {
    Serial.print("[VERY LIGHT]");
  } else if (currentValue < 600) {
    Serial.print("[LIGHT PRESS]");
  } else if (currentValue < 1200) {
    Serial.print("[MEDIUM PRESS]");
  } else if (currentValue < 2000) {
    Serial.print("[HARD PRESS]");
  } else {
    Serial.print("[VERY HARD PRESS]");
  }
  
  Serial.println();
  
  // Print statistics every 50 readings
  if (readingCount % 50 == 0) {
    printStatistics();
  }
  
  delay(100);  // 100ms delay = 10 readings per second
}

void printStatistics() {
  Serial.println("\n----------------------------------------");
  Serial.println("          CALIBRATION STATISTICS");
  Serial.println("----------------------------------------");
  
  Serial.print("Readings Taken:    ");
  Serial.println(readingCount);
  
  Serial.print("Current Value:     ");
  Serial.println(currentValue);
  
  Serial.print("Average Value:     ");
  Serial.println(averageValue, 1);
  
  Serial.print("Minimum (No Press):");
  Serial.println(minValue);
  
  Serial.print("Maximum (Pressed): ");
  Serial.println(maxValue);
  
  Serial.println("\n--- RECOMMENDED THRESHOLDS ---");
  
  if (maxValue > 200) {
    int threshold50 = maxValue * 0.5;
    int threshold60 = maxValue * 0.6;
    int threshold70 = maxValue * 0.7;
    
    Serial.print("Conservative (50%):  ");
    Serial.print(threshold50);
    Serial.println("  ← Good for light press detection");
    
    Serial.print("Balanced (60%):      ");
    Serial.print(threshold60);
    Serial.println("  ← RECOMMENDED for normal use");
    
    Serial.print("Strict (70%):        ");
    Serial.print(threshold70);
    Serial.println("  ← Requires firm press");
    
    Serial.println("\nCopy one of these values to your main sketch:");
    Serial.print("const int threshold = ");
    Serial.print(threshold60);
    Serial.println(";");
    
  } else {
    Serial.println("⚠️  WARNING: Max value too low!");
    Serial.println("   - Check FSR connections");
    Serial.println("   - Press FSR harder");
    Serial.println("   - Verify 10kΩ resistor is connected");
  }
  
  Serial.println("----------------------------------------\n");
}
