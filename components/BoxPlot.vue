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
        <v-row class="mt-4" id="todownload">
            <!-- Chart -->
            <div  id="chartCapture"
                :class="[sorted ? 'col-8' : 'col-12']">
                <div ref="chart" id="boxPlot"></div>
            </div>
            <!-- Performance Table -->
            <div class="col-4" id="performanceCapture" v-if="sorted">
                <v-simple-table class="tools-table" fixed-header id='performanceTable'>
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
             <div class="col-12">
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
            legend: {"orientation": "h"}
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
            legend: {"orientation": "h"}
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
        setTimeout(() => {
            let layout = {
                title: '',
                autosize: true,
                legend: {"orientation": "h"}
            }
            Plotly.react(this.$refs.chart, currentTraces, layout);
        }, 50);
    },

    async downloadChart(format) {
        try {
            if (format === 'pdf') {
                const pdf = new jsPDF();

                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text(`Benchmarking Results of ${this.datasetId} at ${this.formatDateString(this.datasetModDate)}`, 105, 10, null, null, 'center');

                // Get chart image as base64 data URI
                const chartImageURI = await Plotly.toImage(document.getElementById('boxPlot'), { format: 'png', width: 750, height: 600 });

                // Adding image to pdf
                pdf.addImage(chartImageURI, 'PNG', 10, 20);

                if (this.sorted) {
                    const columns = ["Participants", "Performance"]; // Define your columns

                    // Setting table rows
                    const rows = this.traces.map(p => [p.name, p.median]);

                    // Getting our traces
                    let currentTraces = this.traces;

                    // Generate autoTable with custom styles
                    pdf.autoTable({
                    head: [columns],
                    body: rows,
                    startY: 190,
                    theme: 'grid',
                    tableWidth: 'auto',
                    styles: {
                        cellPadding: 1,
                        fontSize: 8,
                        overflow: 'linebreak',
                        halign: 'center'
                    },
                    headStyles: {
                        fillColor: [108, 117, 125]
                    },
                    willDrawCell: function (data) {
                        if (data.row.section === 'body') {
                        // Check if the column header matches 'Performance'
                        if (data.column.dataKey === 0) {
                            const rowIndex = data.row.index;
                            const color = currentTraces[rowIndex].marker.color;

                            // Setting & filling with each trace color
                            pdf.setFillColor(color);
                            pdf.rect(data.cell.x -2, data.cell.y, 10, data.cell.height, 'F');

                            // Restar original color
                            pdf.setFillColor(255, 255, 255);
                        }
                        }
                    },
                    });
                    // Save the PDF
                    pdf.save(`benchmarking_chart__performance_${this.datasetId}.${format}`);
                } else {
                    // Save the PDF
                    pdf.save(`benchmarking_chart_${this.datasetId}.${format}`);
                }

            } else if (format === 'svg') {
                const graphDiv = document.getElementById('boxPlot')
                Plotly.downloadImage(graphDiv, { format: 'svg', width: 800, height: 600, filename: `benchmarking_chart_${this.datasetId}` });

            } else {
                Plotly.relayout(this.$refs.chart, this.layout);

                if(this.sorted) {
                    const toDownloadDiv = document.getElementById('todownload');
                    const downloadCanvas = await HTML2CANVAS(toDownloadDiv, {
                        scrollX: 0,
                        scrollY: 0,
                        width: toDownloadDiv.offsetWidth,
                        height: toDownloadDiv.offsetHeight,
                    });
                    const downloadImage = downloadCanvas.toDataURL(`image/${format}`); 
                    const link = document.createElement('a');
                    link.href = downloadImage;
                    link.download = `benchmarking_chart_${this.datasetId}.${format}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

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

            Plotly.relayout(this.$refs.chart, this.layout);
        } catch (error) {
            console.error('Error downloading chart:', error);
        }
    }
  }
}
</script>
