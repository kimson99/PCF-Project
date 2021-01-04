import {IInputs, IOutputs} from "./generated/ManifestTypes";
import Chart, { TickOptions } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Anchor } from "chartjs-plugin-datalabels/types/options";
export class ChartJS implements ComponentFramework.StandardControl<IInputs, IOutputs> {

private canvas: HTMLCanvasElement;
private ctx: CanvasRenderingContext2D;
private chartTitle: string;
private chartLabels: Array<string>;
private chartType: string;
private myChart: Chart;
private chartDataset: string;
private suggestedMax: number;
private suggestedMin: number;
private showPercent: boolean;
private tickX: TickOptions;
private datalabelsAnchor: Anchor;
	constructor()
	{

	}

	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement)
	{
		Chart.plugins.register(ChartDataLabels);
		this.canvas = document.createElement("canvas");
		this.ctx = <CanvasRenderingContext2D> this.canvas.getContext("2d");
		this.chartType = context.parameters.ChartType.raw ? context.parameters.ChartType.raw: "bar";
		this.chartTitle = context.parameters.ChartTitle.raw ? context.parameters.ChartTitle.raw: "";
		this.chartLabels = context.parameters.ChartLabels.raw ? (context.parameters.ChartLabels.raw).split(",") : [];
		this.chartDataset = context.parameters.ChartDataset.raw? context.parameters.ChartDataset.raw : "";
		this.tickX = {
			fontSize: 20
		};
		this.chartInit();
		container.appendChild(this.canvas);
	}
	
	public chartInit = () => {
		this.myChart = new Chart(this.ctx, {
			type: this.chartType,
			data: {
				labels: this.chartLabels,
				datasets: JSON.parse(this.chartDataset)
			},
			options: {
				plugins: {
					datalabels: {
						anchor: this.datalabelsAnchor,
						font: {
							size: 16
						},
						formatter: (value) => this.showPercent? `${value}%` : value
					}
				},
				legend: {
					position: 'bottom',
					labels: {
						fontSize: 18
					}
				},
				tooltips: {
					titleFontSize: 18,
					bodyFontSize: 16
				},
				scales: {
					yAxes: [{
						ticks: {
							fontSize: 20,
							beginAtZero: true,
							suggestedMax: this.suggestedMax,
							suggestedMin: this.suggestedMin
						}
					}],
					xAxes: [{
						ticks: this.tickX
					}]
				}
			}
		});
	}

	public updateView(context: ComponentFramework.Context<IInputs>): void
	{
		if(this.chartType !== context.parameters.ChartType.raw || this.chartDataset !== context.parameters.ChartDataset.raw || this.showPercent !== context.parameters.showPercent.raw || this.datalabelsAnchor !== context.parameters.datalabelAnchor.raw){
			this.myChart.destroy();
			this.chartDataset = context.parameters.ChartDataset.raw? context.parameters.ChartDataset.raw : "";
			this.chartType = context.parameters.ChartType.raw ? context.parameters.ChartType.raw: "bar";
			this.showPercent = context.parameters.showPercent.raw? context.parameters.showPercent.raw : false;
			this.datalabelsAnchor = context.parameters.datalabelAnchor.raw? context.parameters.datalabelAnchor.raw as Anchor : "end";
		this.tickX = this.showPercent ? {
			fontSize: 20,
			callback: function (value) {
				return value + "%"
			}
		} : {
			fontSize: 20
		};
			this.chartInit();
		};

		

		this.chartTitle = context.parameters.ChartTitle.raw ? context.parameters.ChartTitle.raw: "";
		this.chartLabels = context.parameters.ChartLabels.raw ? (context.parameters.ChartLabels.raw).split(",") : [];
		this.suggestedMax = context.parameters.suggestedMax.raw? context.parameters.suggestedMax.raw : 10;
		this.suggestedMin = context.parameters.suggestedMin.raw? context.parameters.suggestedMin.raw : 0;
		this.myChart.data.labels = this.chartLabels;
		this.myChart.update();
	}

	public getOutputs(): IOutputs
	{
		return {};
	}

	public destroy(): void
	{
		// Add code to cleanup control if necessary
	}
}