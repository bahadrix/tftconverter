# TFTConverter

Browser only tool for conversion from image to C array. Does same thing as ImageConverter565 but you can also use it for multiple images. So you can obtain animations.

See https://bahadrix.github.io/tftconverter to use it online.

## Sample Usage

Following code uses generated `frame.h` file with ESP32 TTGO-Display board.

```c
#include <Arduino.h>
#include <TFT_eSPI.h>

#include <frames.h>

TFT_eSPI tft = TFT_eSPI();

void setup() {
    tft.init();
    tft.setRotation(0);
    tft.setSwapBytes(true);
    tft.fillScreen(TFT_DARKCYAN);
}

void loop()
{

  for(int i = 0; i < frames; i++) {

    tft.pushImage(0, 0, frameWidth, frameHeight, frame[i]);
    delay(40); // frame latency

  }
  
}

```

