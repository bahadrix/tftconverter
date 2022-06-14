import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';

interface ReadResult {
  filename: string;
  hexArray: string[];
  imageWidth: number;
  imageHeight: number;
}


@Component({
  selector: 'app-converter',
  templateUrl: './converter.component.html',
  styleUrls: ['./converter.component.css']
})


export class ConverterComponent implements AfterViewInit {

  @ViewChild('imageCanvas') $canvas: ElementRef | undefined;
  @ViewChild('btnDownload') $btnDownload: ElementRef | undefined;
  canvas: HTMLCanvasElement | undefined;
  btnDownload: HTMLButtonElement | undefined;
  progressPercent: number = 0;
  progressValue: number = 0;
  statusText: string = "Select file(s)";
  downloadDisabled: boolean = true;

  private maxProgressValue = 100;
  private results: ReadResult[] | undefined;

  constructor(private snack: MatSnackBar) {
  }

  public static downloadFile(content: string, filename: string): void {
    const e = document.createElement('a');
    e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    e.setAttribute('download', filename);
    e.style.display = 'none';
    document.body.appendChild(e);
    e.click();
    document.body.removeChild(e);
  }

  ngAfterViewInit(): void {
    this.canvas = this.$canvas!.nativeElement;
    this.btnDownload = this.$btnDownload!.nativeElement;

  }

  async onFileSelected($event: Event) {
    this.downloadDisabled = true;

    const files: File[] = [].slice
      .call(($event.target as HTMLInputElement).files!) // convert to regular array
      .sort(new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare); // natural sort the array

    this.results = [];
    this.progressValue = 0;
    this.progressPercent = 0;
    this.maxProgressValue = 100 * files.length;

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      this.statusText = `Parsing ${file.name} ${i}/${files.length}`
      console.log(`Converting ${file.name}`);
      if (file.type == "image/gif") {
        this.readGIF(file);
      } else if (file.type.startsWith("image/")) {
        this.results.push(await this.readStatic(file));
      } else {
        this.snack.open(`Skipped non-image file: ${file.name}`, "OK");
      }

    }

    this.statusText = `Done. Now you can download the code!`;


    this.downloadDisabled = false;

  }

  onFileDownloadClick() {

    this.statusText = "Parsing..";
    const results = this.results!;


    const arrTexts: string[] = [];
    const filenames: string[] = [];
    for (let imageIndex = 0; imageIndex < this.results!.length; imageIndex++) {
      let result = results[imageIndex];
      filenames.push(result.filename);
      arrTexts.push(`{${result.hexArray.join(', ')}}`);
    }

    const text = `
/*
* Used files with the same order:
* - ${filenames.join("\n* -")}
*/

int frames=${results.length};
int frameWidth=${results[0].imageWidth};
int frameHeight=${results[0].imageHeight};

const unsigned short PROGMEM frame[][${results[0].hexArray.length}] = {${arrTexts.join(',\n')}};
    `;

    try {
      ConverterComponent.downloadFile(text, 'frames.h');
      this.statusText = "Download ready!"
    } catch (e: unknown) {
      this.statusText = "Error while generating header file."
      if (e instanceof RangeError) {
        this.snack.open("Size error. Choose smaller images.", "OK")
      } else if (e instanceof Error) {
        this.snack.open("Error " + e.message, "OK");
      } else {
        this.snack.open("Unknown error occurred.", "OK")
      }

    }


  }

  private updateProgress() {
    this.progressPercent = 100 * this.progressValue / this.maxProgressValue;

  }

  private readGIF(file: File): void {
    this.snack.open("Direct conversion of GIF files not supported yet. But you can select multiple frame files as individual.", "OK")
  }

  private readStatic(file: File): Promise<ReadResult> {
    return new Promise<ReadResult>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const ctx = this.canvas!.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, img.width, img.height);
          let arr = this.convertToCArray(data);


          let hexArray: string[] = [];
          arr.forEach(i => {
            hexArray.push('0x' + i.toString(16).padStart(4, '0').toUpperCase())
          })

          resolve({
            filename: file.name,
            hexArray,
            imageWidth: img.width,
            imageHeight: img.height
          });

        }

        img.src = ev.target!.result as string;

      }

      reader.readAsDataURL(file);
    });

  }

  private convertToCArray(data: ImageData): Uint16Array {

    let arr: Uint16Array = new Uint16Array(data.data.length / 4);
    let k = 0;
    for (let i = 0; i < data.data.length; i++) {
      let red = Math.round(31 * data.data[i++] / 255);
      let green = Math.round(63 * data.data[i++] / 255);
      let blue = Math.round(31 * data.data[i++] / 255);

      arr[k++] = red << 11 | green << 5 | blue;
      this.progressValue += 400 / data.data.length;
      this.updateProgress();
    }

    return arr;

  }
}
