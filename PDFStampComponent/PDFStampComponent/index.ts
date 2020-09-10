import {IInputs, IOutputs} from "./generated/ManifestTypes";
const QRCode = require('qrcode');
import { saveAs } from 'file-saver';
import { PDFDocument, StandardFonts, rgb, grayscale, PDFName, PDFArray, PDFObject, PDFBool, PDFNumber,PageSizes, copyStringIntoBuffer, arrayAsString } from 'pdf-lib';
import { fstat } from "fs";
import { url } from "inspector";
import * as pdfjsLib from 'pdfjs-dist'
/////////THIS THING TOOK SO MUCH TIME, DOESNT WORK IF YOU IMPORT FROM NODE MODULES
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
export class PDFStampComponent implements ComponentFramework.StandardControl<IInputs, IOutputs> {
	private qrCodeText : string;
	private pdfBase64: string;
	private securityCode: string;
	private stampButton: HTMLButtonElement;
	private fileName: string;
	private randNumber: string;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private _notifyOutputChanged: () => void;
	private _container: HTMLDivElement;

	constructor()
	{

	}

	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement)
	{	
		//Creat Element and assign variables
		this._container = document.createElement("div");
		this.canvas = document.createElement('canvas');
		this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		this.pdfBase64 = context.parameters.pdfBase64.raw? context.parameters.pdfBase64.raw : "";
		this.securityCode = context.parameters.securityCode.raw? context.parameters.securityCode.raw : "";
		this.qrCodeText = context.parameters.qrCodeContext.raw? context.parameters.qrCodeContext.raw : "";
		this.fileName = context.parameters.stampedFileName.raw? context.parameters.stampedFileName.raw : "";
		this._notifyOutputChanged = notifyOutputChanged;
		this.stampButton = document.createElement("button");
		this.stampButton.addEventListener("click",this.onButtonClick.bind(this));
		//Style stamp button
		this.stampButton.id = "btn-stamp-pdf";
		this.stampButton.style.borderRadius = (context.parameters.btnBorderRadius.raw? context.parameters.btnBorderRadius.raw : "") + "px";
		this.stampButton.style.width = (context.parameters.btnWidth.raw? context.parameters.btnWidth.raw : "") + "px";
		this.stampButton.style.height = (context.parameters.btnHeight.raw? context.parameters.btnHeight.raw : "") + "px";
		this.stampButton.style.fontSize = (context.parameters.btnFontSize.raw? context.parameters.btnFontSize.raw : "") + "px";
		this.stampButton.innerHTML = context.parameters.btnText.raw? context.parameters.btnText.raw : "";

		container.appendChild(this._container);
		container.appendChild(this.stampButton);
	};
	
	//Stamp PDF function

	public pdfStamp = async() => {

		//Fetch the pdf from base64 string
		const inputPdfBytes = this.pdfBase64;

		//Load PDF
		const pdfDoc = await PDFDocument.load(inputPdfBytes);
		
		//Get the QR code
		let qrCodeOpt1 = {
			width: 200,
			color: {
				dark: "#0000001A",
				light: "#0000"
			}
		}
		
		let qrCodeOpt2 = {
			color: {
				dark: "#000000",
				light: "#ffffff"
			}
		}
		
		var base64QrCode1 = "";
		var base64QrCode2 = "";
		QRCode.toDataURL(this.qrCodeText,qrCodeOpt1,function(err: Error, url:string) {
			base64QrCode1 = url
		});
		QRCode.toDataURL(this.qrCodeText,qrCodeOpt2,function(err: Error, url:string) {
			base64QrCode2 = url
		});
		
		// console.log(base64QrCode2);
		//Embed image qr code
		const pngQrCode1 = await pdfDoc.embedPng(base64QrCode1);
		const pngQrCode2 = await pdfDoc.embedPng(base64QrCode2);
		
		// Get the width/height of the PNG image scaled down to 50% of its original size
		const pngDims1 = pngQrCode1.scale(1);
		const pngDims2 = pngQrCode2.scale(0.5);
		
		//Get pages from the pdf
		const pages = pdfDoc.getPages();
		let {width,height} = pages[0].getSize();
		//Stamp image on page
		pages.forEach(page =>{
			//Draw dimmed QRCode in center
			page.drawImage(pngQrCode1, {
				x: (page.getWidth() - pngDims1.width) / 2,
				y: (page.getHeight() - pngDims1.height) / 2,
				width: pngDims1.width,
				height: pngDims1.height,
			});

			//Draw QRCode on right corner
			page.drawImage(pngQrCode2, {
			x: page.getWidth() - pngDims2.width - 8,
			y: page.getHeight() - pngDims2.height - 8,
			width: pngDims2.width,
			height: pngDims2.height,
			});

			//Draw text for QR code in center
			page.drawText(this.securityCode, {
			x: page.getWidth() /2 - 20,
			y: (page.getHeight() - pngDims1.height) / 2 + 4,
			size: 16,
			opacity: 0.2,
			});

			//Draw text for QR code on right corner
			page.drawText(this.securityCode, {
			x: page.getWidth() - pngDims2.width - 4,
			y: (page.getHeight() - pngDims2.height) - 10,
			size: 8,
			});
		});
		
		// Serialize the PDFDocument to bytes
		const pdfBytes = await pdfDoc.save();
		let arrImage: Array<{key: number, image: string}> = [];
		let loadingTask = pdfjsLib.getDocument(pdfBytes);
		loadingTask.promise.then((pdf: any) => {
			const pagesCount = pdf.numPages;
			for (let i = 1; i < pagesCount + 1; i++) {
				pdf.getPage(i).then((page: any) => {
					let tempCanvas = document.createElement("canvas");
					let tempCtx = tempCanvas.getContext("2d");
					let viewport = page.getViewport({ scale: 1 });
					tempCanvas.width = viewport.width;
					tempCanvas.height = viewport.height;
					let renderContext = {
						canvasContext: tempCtx,
						viewport: viewport
					};
					page.render(renderContext).promise.then(() => {
						let img = tempCanvas.toDataURL("image/jpeg", 1);
						arrImage.push({key: i,image: img});
						if(arrImage.length === pagesCount){
							this.toPDFImage(arrImage,width,height);
						}
					});
				})
			};
		})
	}

	////TURN PDF INTO IMAGE///////////
	public toPDFImage = async(pdfImages: Array<{key: number, image: string}>,pdfWidth:number,pdfHeight:number) => {
		const pdfDoc = await PDFDocument.create();
		const sortedArray = pdfImages.sort((a,b) => a.key - b.key);
		for (let i in sortedArray){
			let page = pdfDoc.addPage([pdfWidth, pdfHeight]);
			let stampOnPNG = await pdfDoc.embedJpg(pdfImages[i].image);
			page.drawImage(stampOnPNG, {
				x: 0,
				y: 0,
				width: pdfWidth,
				height: pdfHeight
			});
		}
	
		const pdfBytes = await pdfDoc.save();

		//Download
		let blob = new Blob([pdfBytes], { type: "application/pdf" });
		saveAs(blob, this.fileName + ".pdf");
	};
	

	//Stamp pdf on click
	public onButtonClick(evt: Event) {
		this.pdfStamp();
		this.randNumber = Math.random().toString();
		this._notifyOutputChanged();
	}

	public updateView(context: ComponentFramework.Context<IInputs>): void
	{
		this.pdfBase64 = context.parameters.pdfBase64.raw? context.parameters.pdfBase64.raw : "";
		this.securityCode = context.parameters.securityCode.raw? context.parameters.securityCode.raw : "";
		this.qrCodeText = context.parameters.qrCodeContext.raw? context.parameters.qrCodeContext.raw : "";
		this.fileName = context.parameters.stampedFileName.raw? context.parameters.stampedFileName.raw : "";
		//Style
		this.stampButton.style.borderRadius = (context.parameters.btnBorderRadius.raw? context.parameters.btnBorderRadius.raw : "") + "px";
		this.stampButton.style.width = (context.parameters.btnWidth.raw? context.parameters.btnWidth.raw : "") + "px";
		this.stampButton.style.height = (context.parameters.btnHeight.raw? context.parameters.btnHeight.raw : "") + "px";
		this.stampButton.style.fontSize = (context.parameters.btnFontSize.raw? context.parameters.btnFontSize.raw : "") + "px";
		this.stampButton.innerHTML = context.parameters.btnText.raw? context.parameters.btnText.raw : "";
	}

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs
	{
		return {
			notifyChanged: this.randNumber
		};
	}

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void
	{
		this.stampButton.addEventListener("click",this.onButtonClick.bind(this));
	}
}