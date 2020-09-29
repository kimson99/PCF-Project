import { type } from "os";
import { IInputs, IOutputs } from "./generated/ManifestTypes";

export class EncodeDecode implements ComponentFramework.StandardControl<IInputs, IOutputs> {
	private encodeColumns: Array<string>;
	private data: any;
	private codeTable: any;
	private saltColumn: string;
	private outputData: string;
	private delimiter: string;
	private delimiter2: string;
	private saltPosition: Array<string>;
	private _notifyOP: () => void;
	/**
	 * Empty constructor.
	 */
	constructor() {

	}

	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement) {
		this.encodeColumns = context.parameters.Columns.raw ? (context.parameters.Columns.raw).split(",") : [];
		this.saltPosition = context.parameters.Columns.raw ? (context.parameters.Columns.raw).split(",") : ["1","3"];
		this._notifyOP = notifyOutputChanged;
	}


	public updateView(context: ComponentFramework.Context<IInputs>): void {
		this.encodeColumns = context.parameters.Columns.raw ? (context.parameters.Columns.raw).split(",") : [];
		this.saltPosition = context.parameters.Columns.raw ? (context.parameters.Columns.raw).split(",") : ["1","3"];
		this.saltColumn = context.parameters.saltColumn.raw ? context.parameters.saltColumn.raw : "guid_column";
		this.delimiter = context.parameters.CSVdelimiter.raw ? context.parameters.CSVdelimiter.raw : ",";
		this.delimiter2 = context.parameters.CSVdelimiter2.raw ? context.parameters.CSVdelimiter2.raw : "\n";
		if (this.data || this.data !== context.parameters.dataSet.raw) {
			this.data = context.parameters.dataSet.raw ? context.parameters.dataSet.raw : ""
			this.getData(this.data, context.parameters.ModeSwitch.raw,context.parameters.OutputData.raw?context.parameters.OutputData.raw:"");
		}
	}

	public getData = (data: any, mode: boolean, oldData: string) => {
		const parsedData = JSON.parse(data);
		if (mode) {
			parsedData.forEach((row: any) => {
				Object.keys(row).forEach((key: any) => {
					// console.log(row[key]);
					this.encodeColumns.indexOf(key) !== -1 ? row[key] = this.encodeText(row[key], row[this.saltColumn]) : false;
				})
			})
		} else {
			parsedData.forEach((row: any) => {
				Object.keys(row).forEach((key: any) => {
					this.encodeColumns.indexOf(key) !== -1 ? row[key] = this.decodeText(row[key], row[this.saltColumn]) : false;
				});
			});
		};
		let header = Object.keys(parsedData[0]).join(this.delimiter) + this.delimiter2;
		let body = parsedData.map((row: any) => {
			return Object.values(row).join(this.delimiter) + this.delimiter2
		});
		this.outputData = header + body.join('');
		if(this.outputData!== oldData){
			this._notifyOP();
		}
	}

	public mapText = (text: string) => {
		const splitText = text.split("");
		const indexedArr = splitText.map((char) => {
			return char.charCodeAt(0) as number
		});
		return indexedArr
	}

	public encodeText = (text: string, guid: string) => {
		const salt = this.mapText(guid.charAt(Number.parseInt(this.saltPosition[0])));
		const root = this.mapText(guid.charAt(Number.parseInt(this.saltPosition[1])));
		const mappedText = this.mapText(text);
		
		
		const newMappedArr = mappedText.map((index: any) => (index + (salt[0] * root[0])) % 65535);

		const encodedArr = newMappedArr.map((index) => {
			return String.fromCharCode(index)
		});

		const encodedText = encodedArr.join('');
		return encodedText;
	};

	public decodeText = (text: string, guid: string) => {
		const salt = this.mapText(guid.charAt(Number.parseInt(this.saltPosition[0])));
		const root = this.mapText(guid.charAt(Number.parseInt(this.saltPosition[1])))
		const mappedText = this.mapText(text);
		const newMappedArr = mappedText.map((index: any) => 
			(index+(salt[0] * root[0])*(65535-1))%65535);
		const decodedArr = newMappedArr.map((index) => {
			return String.fromCharCode(index)
		});
		const decodedText = decodedArr.join('');
		return decodedText;
	}

	public getOutputs(): IOutputs {
		return {
			OutputData: this.outputData
		};
	}

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void {
		// Add code to cleanup control if necessary
	}
}