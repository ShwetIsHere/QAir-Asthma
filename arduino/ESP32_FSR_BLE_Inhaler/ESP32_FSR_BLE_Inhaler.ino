/*
 * QAir - ESP32 FSR Inhaler Monitor (BLE)
 * Hardware: 3.3V → FSR → GPIO34 → 10kΩ → GND
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Configuration
const int fsrPin = 34;
const int threshold = 500;
const unsigned long debounceDelay = 3000;

#define DEVICE_NAME "QAir-Inhaler"
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define TRIGGER_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// Global Variables
BLEServer* pServer = NULL;
BLECharacteristic* pTriggerCharacteristic = NULL;
bool deviceConnected = false;
bool lastPressState = false;
unsigned long lastTriggerTime = 0;
int fsrValue = 0;
uint32_t triggerCount = 0;


// BLE Callbacks
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("BLE Connected");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      delay(500);
      pServer->startAdvertising();
      Serial.println("BLE Disconnected - Advertising");
    }
};

void setup() {
  Serial.begin(115200);
  pinMode(fsrPin, INPUT);
  
  Serial.println("\nQAir Inhaler Monitor");
  Serial.println("Threshold: " + String(threshold));
  
  // Initialize BLE
  BLEDevice::init(DEVICE_NAME);
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  pTriggerCharacteristic = pService->createCharacteristic(
    TRIGGER_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pTriggerCharacteristic->addDescriptor(new BLE2902());
  
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  
  Serial.println("BLE Started - Ready to connect");
}


void loop() {
  fsrValue = analogRead(fsrPin);
  bool isPressed = (fsrValue > threshold);
  
  // Detect press
  if (isPressed && !lastPressState) {
    unsigned long currentTime = millis();
    
    if (currentTime - lastTriggerTime >= debounceDelay) {
      triggerCount++;
      lastTriggerTime = currentTime;
      
      Serial.println("Trigger #" + String(triggerCount) + " - FSR: " + String(fsrValue));
      
      if (deviceConnected) {
        // Use short JSON format to fit in BLE MTU (20 bytes default)
        // Format: T,fsrValue,count (e.g., "T,856,1")
        String data = "T," + String(fsrValue) + "," + String(triggerCount);
        
        // Print for debugging
        Serial.println("Data: " + data);
        Serial.println("Length: " + String(data.length()) + " bytes");
        
        // Set value and notify
        pTriggerCharacteristic->setValue(data.c_str());
        pTriggerCharacteristic->notify();
        
        Serial.println("Sent to app");
        
        // Small delay to ensure transmission
        delay(100);
      }
    }
  }
  
  lastPressState = isPressed;
  delay(200);
}
