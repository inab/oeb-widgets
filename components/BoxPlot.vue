<template>
    <v-container fluid>
        <v-row>
            <v-col cols="8">
                <div class="butns">
                <!-- Header Buttons -->
                <v-btn-toggle class="custom-btn-toggle">
                    <v-menu offset-y>
                        <template v-slot:activator="{ on, attrs }" >
                            <v-btn  outlined v-bind="attrs" v-on="on"
                                class="button-download custom-height-button" :disabled="loading">
                            {{ (sorted)?sortedName:'Sort & Classify Data' }}
                            </v-btn>
                        </template>
                        <v-list>
                            <v-list-item-group>
                                <v-list-item  v-for="(sortKey, index) in sortMenu"
                                    class="menu-item"
                                    :key="index"
                                    @click="handleChangeSort(index)">
                                    <v-list-item-title>
                                        {{ sortKey }}
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list-item-group>
                        </v-list>
                    </v-menu>
                    <v-menu offset-y>
                        <template v-slot:activator="{ on, attrs }" >
                            <v-btn  outlined v-bind="attrs" v-on="on"
                                class="button-download custom-height-button" :disabled="loading">
                            {{ orientation }}
                            </v-btn>
                        </template>
                        <v-list>
                            <v-list-item-group>
                                <v-list-item  v-for="(orientation, index) in orientationMenu"
                                    class="menu-item"
                                    :key="index"
                                    @click="handleChangeOrientation(index)">
                                    <v-list-item-title>
                                        {{ orientation }}
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list-item-group>
                        </v-list>
                    </v-menu>
                    <v-menu offset-y>
                        <template v-slot:activator="{ on, attrs }" >
                            <v-btn  outlined v-bind="attrs" v-on="on"
                                class="button-download custom-height-button" :disabled="loading">
                            {{ graphStyle }}
                            </v-btn>
                        </template>
                        <v-list>
                            <v-list-item-group>
                                <v-list-item  v-for="(style, index) in graphStyleMenu"
                                    class="menu-item"
                                    :key="index"
                                    @click="handleChangeGraphStyle(index)">
                                    <v-list-item-title>
                                        {{ style }}
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list-item-group>
                        </v-list>
                    </v-menu>
                    <!-- Dropdown for Download -->
                    <v-menu offset-y>
                        <template v-slot:activator="{ on, attrs }" >
                            <v-btn  outlined v-bind="attrs" v-on="on"
                            class="button-download custom-height-button" :disabled="loading">
                            Download
                            </v-btn>
                        </template>
                        <v-list>
                            <v-list-item @click="downloadChart('svg')" class="menu-item">
                            <v-list-item-title>SVG (only plot)</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="downloadChart('png')" class="menu-item">
                            <v-list-item-title>PNG</v-list-item-title>
                            </v-list-item>
                            <v-divider></v-divider>
                            <v-list-item @click="downloadChart('pdf')" class="menu-item">
                            <v-list-item-title>PDF</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                    <!-- End of Dropdown for Download -->
                </v-btn-toggle>
                </div>
            </v-col>
        </v-row>

        <!-- Overlay para el loader -->
        <v-overlay :value="isDownloading">
        <div class="overlay-content">
            <v-progress-circular
            indeterminate
            size="64"
            class="overlay-progress"
            ></v-progress-circular>
            <div class="overlay-text">Downloading...</div>
        </div>
        </v-overlay>
        <v-row class="mt-4" id="todownload" :class="{ 'centered-download': isDownloading }">
            <!-- Chart -->
            <div  id="chartCapture" :class="[sorted ? 'col-8' : 'col-12']">
                <!-- CHART -->
                <div ref="chart" id="boxPlot"></div>
            </div>
            <!-- Performance Table -->
            <div class="col-4" id="performanceCapture" v-if="sorted">
                <v-simple-table class="tools-table" height="500px" fixed-header id='performanceTable'>
                    <thead>
                        <tr>
                            <th class="tools-th">Participants</th>
                            <th class="classify-th">Performance
                                <v-tooltip bottom>
                                    <template v-slot:activator="{ on, attrs }">
                                        <i class="material-icons custom-alert-icon" v-bind="attrs" v-on="on">
                                        info
                                        </i>
                                    </template>
                                    <div class="quartile-message">
                                        <p><b>The performance label</b></p>
                                        <p>The values will be displayed in the graph data order 'optimization'.<br/>
                                            Else, the default order should be the received data order.<br/>
                                            Its possible to change display order by click in 'Sort & Classify Data' button.
                                        </p>
                                    </div>
                                </v-tooltip>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(trace, index) in traces" :key="index">
                            <td class="toolColumn">
                                <div class="color-box"
                                    :style="{ backgroundColor: trace.marker.color }">
                                </div>
                                <span>{{ trace.name }}</span>
                            </td>
                            <td>
                                {{ trace.median[0] }}
                            </td>
                        </tr>
                    </tbody>
                </v-simple-table>
            </div>
            <!-- ID AND DATE TABLE -->
             <div :class="isDownloading ? 'col-8' : 'col-12'">
                <div class="info-table">
                    <v-simple-table class="custom-table" v-if="datasetModDate">
                        <tbody>
                            <tr>
                                <th class="first-th">Dataset ID</th>
                                <td>{{ datasetId }}</td>
                                <th>Last Update</th>
                                <td class="last-td">{{ formatDateString(datasetModDate) }}</td>
                            </tr>
                        </tbody>
                    </v-simple-table>
                </div>
            </div>
        </v-row>
    </v-container>
</template>
<script>
// Importación de Plotly
import Plotly from 'plotly.js-dist';
import 'jspdf-autotable';
import '../styles/common.css';
const imgLogo = 'data:image/png;base64,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';

// REQUIREMENTS
const HTML2CANVAS = require('html2canvas');
const { jsPDF } = require('jspdf');

const GRAPH_CONFIG = {
    displayModeBar: false,
    responsive: true,
    hovermode: false
};

export default {
  name: 'BoxPlot',
  props: {
    dataJson: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
        loading: false,
        datasetId: null,
        datasetModDate: null,
        formattedDate: null,
        traces: [],
        originalTraces: [],
        orientationMenu: {
            'h': 'Horizontal',
            'v': 'Vertical'
        },
        orientation: null,
        graphStyleMenu: {
            'm': 'Mean',
            'sd': 'Standard Deviation',
            'empty': 'None'
        },
        graphStyle: 'Graph Style',
        sortMenu: {
            'default': 'Default Sort',
            'minimum': 'Minimum Sort',
            'maximus': 'Maximus Sort'
        },
        sortedName: 'Default Sort',
        sorted: false,
        isDownloading: false,
        performanceData: [],
        markerColors: ['#D62728', '#FF7F0E', '#8C564B', '#E377C2', '#4981B6', '#BCBD22', '#9467BD', '#0C9E7B', '#7F7F7F', '#31B8BD', '#FB8072', '#62D353'],
    };
  },
  mounted() {
    this.renderChart();
  },
  methods: {
    async renderChart() {
        this.loading = false

        // Parse dataset values
        const data = this.dataJson.inline_data;
        this.datasetId = await this.dataJson._id;
        this.datasetModDate = this.dataJson.dates.modification;
        this.visualizationData = data.visualization;
        this.sortedName = data.visualization.optimization ?? 'Default Sort';
        this.sorted = data.visualization.optimization ?? false;
        this.challenge_participants = data.challenge_participants
        this.orientation = this.orientationMenu.v;

        // Build traces
        for (let i = 0; i < data.challenge_participants.length; i++) {
            const participant = data.challenge_participants[i];

            const trace = {
                name: participant.name,
                x: [participant.name],
                q1: [participant.q1],
                median: [participant.median],
                q3: [participant.q3],
                lowerfence: [participant.lowerfence],
                upperfence: [participant.upperfence],
                mean: [participant.mean],
                boxmean: false,
                type: 'box',
                orientation: 'v',
                marker:{
                    color: this.markerColors[i]
                }
            };
            this.traces.push(trace);

            // Copy original traces to reset current filter states
            this.originalTraces.push(trace)
        }

        // Order de default traces in some order
        if(this.sorted) {
            (this.sortedName == 'minimum') ? this.traces.sort((a, b) => a.median > b.median) : this.traces.sort((a, b) => a.median < b.median)
        }

        // Default layout
        this.layout = {
            title: '',
            autosize: true,
            height: 600,
            legend: {"orientation": "h"},
            showlegend: true,
            margin: { l: 50, r: 50, t: 100, b: 110, pad: 4 },
            images: [
                {
                    source: imgLogo,
                    xref: "paper",
                    yref: "paper",
                    x: 0.95,
                    y: 1.17,
                    sizex: 0.1,
                    sizey: 0.3,
                    xanchor: "right",
                    yanchor: "top",
                    opacity: 0
                }
            ]
        }

        if(this.orientation == 'Horizontal') {
            delete this.layout.xaxis
            this.layout.yaxis = {
                title: {
                    text: this.visualizationData.y_axis,
                    font: {
                        family: 'Arial, sans-serif',
                        size: 18,
                        color: 'black',
                        weight: 'bold',
                    },
                }
            }
        } else {
            delete this.layout.xaxis
            this.layout.yaxis = {
                title: {
                    text: this.visualizationData.y_axis,
                    font: {
                        family: 'Arial, sans-serif',
                        size: 18,
                        color: 'black',
                        weight: 'bold',
                    },
                }
            }
        }

        Plotly.newPlot(this.$refs.chart, this.traces, this.layout, GRAPH_CONFIG);

        // Table visibility
        this.handleTableVisility();
    },

    // ----------------------------------------------------------------
    // FORMAT DATE
    // ----------------------------------------------------------------
    formatDateString(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },

    handleChangeOrientation(orientation) {
        this.traces.map((item) => {
            item.orientation = orientation
            if(orientation == 'h'){
                delete item.x
                item.y = [ item.name ]
            } else {
                delete item.y
                item.x = [ item.name ]
            }
        })

        this.layout = {
            title: '',
            autosize: true,
            legend: {"orientation": "h"},
            showlegend: true,
            height: 600,
            margin: { l: 50, r: 50, t: 100, b: 110, pad: 4 },
            images: [
                {
                    source: imgLogo,
                    xref: "paper",
                    yref: "paper",
                    x: 0.95,
                    y: 1.17,
                    sizex: 0.1,
                    sizey: 0.3,
                    xanchor: "right",
                    yanchor: "top",
                    opacity: 0
                }
            ]
        }

        if(orientation == 'h') {
            delete this.layout.yaxis
            this.layout.xaxis = {
                title: {
                    text: this.visualizationData.y_axis,
                    font: {
                        family: 'Arial, sans-serif',
                        size: 18,
                        color: 'black',
                        weight: 'bold',
                    },
                }
            }
        } else {
            delete this.layout.xaxis
            this.layout.yaxis = {
                title: {
                    text: this.visualizationData.y_axis,
                    font: {
                        family: 'Arial, sans-serif',
                        size: 18,
                        color: 'black',
                        weight: 'bold',
                    },
                }
            }
        }

        Plotly.react(this.$refs.chart, this.traces, this.layout);
    },

    handleChangeGraphStyle(style) {
        this.traces.map((item) => {
            if(style == 'm') {
                item.boxmean = true;
            } else if(style == 'sd') {
                item.boxmean = 'sd';
            } else {
                item.boxmean = false;
            }
        });
        Plotly.react(this.$refs.chart, this.traces, this.layout);
    },

    handleChangeSort(sortKey) {
        if(sortKey != 'default') {
            (sortKey == 'minimum') ? this.traces.sort((a, b) => a.median > b.median) : this.traces.sort((a, b) => a.median < b.median);
        } else {
            this.traces = this.originalTraces;
        }
        this.sorted = (sortKey != 'default') ? true : false;
        this.sortedName =  this.sortMenu[sortKey];

        // Refresh graph
        this.handleTableVisility();
    },

    handleTableVisility() {
        let currentTraces = this.traces;
        let orientation = this.orientation;
        let orientationText = this.visualizationData.y_axis
        setTimeout(() => {
            let layout = {
                title: '',
                autosize: true,
                legend: {"orientation": "h"},
                showlegend: true,
                height: 600,
                margin: { l: 50, r: 50, t: 100, b: 110, pad: 4 },
                images: [
                {
                    source: imgLogo,
                    xref: "paper",
                    yref: "paper",
                    x: 0.95,
                    y: 1.17,
                    sizex: 0.1,
                    sizey: 0.3,
                    xanchor: "right",
                    yanchor: "top",
                    opacity: 0
                }
            ]
            }

            if(orientation == 'Horizontal' || orientation == 'h') {
                layout.xaxis = {
                    title: {
                        text: orientationText,
                        font: {
                            family: 'Arial, sans-serif',
                            size: 18,
                            color: 'black',
                            weight: 'bold',
                        },
                    }
                }
            } else {
                layout.yaxis = {
                    title: {
                        text: orientationText,
                        font: {
                            family: 'Arial, sans-serif',
                            size: 18,
                            color: 'black',
                            weight: 'bold',
                        },
                    }
                }
            }
            Plotly.react(this.$refs.chart, currentTraces, layout);
        }, 50);
    },

    async downloadChart(format) {
        try {
            // Show watermark
            this.layout.images[0].opacity = 0.5;
            Plotly.relayout(this.$refs.chart, this.layout);

            if (format === 'pdf') {
                const pdf = new jsPDF();

                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text(`Benchmarking Results of ${this.datasetId} at ${this.formatDateString(this.datasetModDate)}`, 105, 10, null, null, 'center');

                if (this.sorted) {
                    this.isDownloading = true;
                    await this.$nextTick();
                    // Agregar un pequeño retraso para asegurarse de que los cambios se hayan renderizado
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const toDownloadDiv = document.getElementById('todownload');

                    const table = document.getElementById('performanceTable');
                    const innerDiv = table.querySelector('div[style*="height"]');
                    const originalHeight = innerDiv.style.height;

                    // Remove the height style
                    innerDiv.style.height = '';

                    // Crear una fila en blanco temporalmente
                    const tableBody = table.querySelector('tbody');
                    const blankRow = document.createElement('tr');
                    const numCols = tableBody.rows[0].cells.length;
                    for (let i = 0; i < numCols; i++) {
                        const newCell = document.createElement('td');
                        newCell.innerHTML = '&nbsp;'; // Añadir espacio en blanco
                        newCell.style.border = 'none'; // Quitar el borde
                        blankRow.appendChild(newCell);
                    }
                    tableBody.appendChild(blankRow);


                    const downloadCanvas = await HTML2CANVAS(toDownloadDiv, {
                    scrollX: 0,
                    scrollY: 0,
                    width: toDownloadDiv.offsetWidth,
                    height: toDownloadDiv.offsetHeight,
                    scale: 2,  // Aumentar la escala para mejorar la calidad de la imagen
                    useCORS: true,  // Permitir recursos de diferentes dominios
                    });

                    // Eliminar la fila en blanco después de la captura
                    tableBody.removeChild(blankRow);

                    // Restore the height style
                    innerDiv.style.height = originalHeight;

                    const downloadImage = downloadCanvas.toDataURL(`image/${format}`);

                    // Get the width and height of the image in pixels
                    const imgWidth = downloadCanvas.width;
                    const imgHeight = downloadCanvas.height;

                    // Get the size of the PDF page in mm
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();

                    // Calculate the scaling factor to fit the image within the page
                    const scaleX = pageWidth / imgWidth;
                    const scaleY = pageHeight / imgHeight;
                    let scale = Math.min(scaleX, scaleY);

                    scale *= 1.3;

                    // Calculate the new width and height of the image in mm
                    const scaledWidth = imgWidth * scale;
                    const scaledHeight = imgHeight * scale;

                    // Center the image on the page
                    const xOffset = (pageWidth - scaledWidth) / 2;
                    const yOffset = 20; // Adjust this value to position the image vertically as needed

                    pdf.addImage(downloadImage, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight);
                    this.isDownloading = false;

                    // Save the PDF
                    pdf.save(`benchmarking_chart__performance_${this.datasetId}.${format}`);
                } else {
                    // Get chart image as base64 data URI
                    const chartImageURI = await Plotly.toImage(document.getElementById('boxPlot'), { format: 'png', width: 750, height: 600 });

                    // Adding image to pdf
                    pdf.addImage(chartImageURI, 'PNG', 10, 20);
                    // Save the PDF
                    pdf.save(`benchmarking_chart_${this.datasetId}.${format}`);
                }

            } else if (format === 'svg') {
                const graphDiv = document.getElementById('boxPlot')
                Plotly.downloadImage(graphDiv, { format: 'svg', width: 800, height: 600, filename: `benchmarking_chart_${this.datasetId}` });

            } else {
                if(this.sorted) {

                    this.isDownloading = true;
                    await this.$nextTick();
                    // Agregar un pequeño retraso para asegurarse de que los cambios se hayan renderizado
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const toDownloadDiv = document.getElementById('todownload');

                    const table = document.getElementById('performanceTable');
                    const innerDiv = table.querySelector('div[style*="height"]');
                    const originalHeight = innerDiv.style.height;

                    // Remove the height style
                    innerDiv.style.height = '';

                    // Crear una fila en blanco temporalmente
                    const tableBody = table.querySelector('tbody');
                    const blankRow = document.createElement('tr');
                    const numCols = tableBody.rows[0].cells.length;
                    for (let i = 0; i < numCols; i++) {
                        const newCell = document.createElement('td');
                        newCell.innerHTML = '&nbsp;'; // Añadir espacio en blanco
                        newCell.style.border = 'none'; // Quitar el borde
                        blankRow.appendChild(newCell);
                    }
                    tableBody.appendChild(blankRow);


                    const downloadCanvas = await HTML2CANVAS(toDownloadDiv, {
                    scrollX: 0,
                    scrollY: 0,
                    width: toDownloadDiv.offsetWidth,
                    height: toDownloadDiv.offsetHeight,
                    scale: 2,  // Aumentar la escala para mejorar la calidad de la imagen
                    useCORS: true,  // Permitir recursos de diferentes dominios
                    });

                    // Eliminar la fila en blanco después de la captura
                    tableBody.removeChild(blankRow);

                    // Restore the height style
                    innerDiv.style.height = originalHeight;

                    const downloadImage = downloadCanvas.toDataURL(`image/${format}`);

                    const link = document.createElement('a');
                    link.href = downloadImage;
                    link.download = `benchmarking_chart_${this.datasetId}.${format}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    this.isDownloading = false;

                } else {
                    const options = { format, height: 700, width: 800 };
                    Plotly.toImage(this.$refs.chart, options)
                    .then((url) => {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `benchmarking_chart_${this.datasetId}.${format}`;
                        link.click();
                    })
                    .catch((error) => {
                        console.error(`Error downloading graphic as ${format}`, error);
                    });
                }
            }

            // Hide watermark
            this.layout.images[0].opacity = 0;
            Plotly.relayout(this.$refs.chart, this.layout);
        } catch (error) {
            console.error('Error downloading chart:', error);
        }
    }
  }
}
</script>
