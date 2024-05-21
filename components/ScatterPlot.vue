<template>
    <v-container fluid>
    <v-row>
      <v-col cols="8">
        <div class="butns">

          <!-- BUTTONS -->
          <v-btn-toggle class="custom-btn-toggle">

            <!-- Dropdown for Clas -->
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn outlined v-bind="attrs" v-on="on">
                  {{classificationButtonText}}
                </v-btn>
              </template>
              <v-list>
                <v-list-item class="menu-item"  @click="noClassification">
                  <v-list-item-title>No Classification</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item">
                  <v-list-item-title>Square Quartiles</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item">
                  <v-list-item-title>Diagonal Quartiles</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item">
                  <v-list-item-title>K-Means Clustering</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>

            <!-- Reset View / Optimal view -->
            <v-btn @click="toggleView" outlined>
              {{ viewButtonText }}
            </v-btn>

            <!-- Dropdown for Download -->
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn outlined v-bind="attrs" v-on="on">
                  Download
                </v-btn>
              </template>
              <v-list>
                <v-list-item class="menu-item">
                  <v-list-item-title>PNG</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item">
                  <v-list-item-title>PDF</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item">
                  <v-list-item-title>SVG</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item class="menu-item">
                  <v-list-item-title>JSON (raw data)</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
            <!-- End of Dropdown for Download -->
          </v-btn-toggle>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <!-- Chart -->
      <v-col cols="8" id="chartCapture">
        <div ref="chart" id="scatterPlot"></div>
        <br>

        <!-- Error message -->
        <CustomAlert
          v-if="showMessageError"
          title="Warning"
          message="At least four participants are required for the benchmark!"
          type="warning"
        />

        <!-- ID AND DATE TABLE -->
        <v-simple-table class="custom-table">
          <tbody>
                <tr>
                  <th class="first-th">Dataset ID</th>
                  <td>{{ datasetId }}</td>
                  <th>Last Update</th>
                  <td class="last-td">{{ formatDateString(datasetModDate) }}</td>
                </tr>
              </tbody>
        </v-simple-table>
      </v-col>

    </v-row>
  </v-container>
</template>

<script>
// Importación de Plotly
import Plotly from 'plotly.js-dist';
import CustomAlert from '~/components/CustomAlert.vue';
const pf = require('pareto-frontier');


export default {
  name: 'ScatterPlot',
  components:{
    CustomAlert
  },
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
      datasetPolarity: null,
      visualizationData: null,
      formattedDate: null,
      originalData: null,
      layout: null,
      markerColors: ['#D62728', '#FF7F0E', '#8C564B', '#E377C2', '#4981B6', '#BCBD22', '#9467BD', '#0C9E7B', '#7F7F7F', '#31B8BD', '#FB8072', '#62D353'],
      colorIndex: 0,
      symbols: ['circle', 'triangle-up', 'pentagon', 'cross', 'x', 'star', 'star-diamond', 'square', 'diamond-tall'],
      currentIndex: 0,
      xValues: [],
      yValues: [],
      toolID: [],
      allToolID: [],
      dataPoints: [],
      paretoPoints: [],
      optimalXaxis: null,
      optimalYaxis: null,
      // Error messages
      showMessageError: false,
      dismissCountDown: 0,
      // View Button
      viewApplied: false,
      // Views by Classification
      viewKmeans: false,
      viewSquare: false,
      viewDiagonal: false,
      showAlert: false
      
    };
  },
  mounted() {
    // Renderizar el scatter plot cuando el componente se monta
    this.renderChart();
  },
  methods: {
    // CREATE PLOT, FUNCTION PRINCIPAL
    // ----------------------------------------------------------------
    async renderChart() {
      this.loading = true
      
      // Fetch dataset values
      const data = this.dataJson.inline_data
      this.datasetId = await this.dataJson._id
      this.datasetModDate = this.dataJson.dates.modification
      this.visualizationData = data.visualization
      // Save original data for future use
      this.originalData = data;

      // Data structures for Plotly
      const traces = [];

      // Data for the Pareto frontier and Quartile
      this.xValues = data.challenge_participants.map((participant) => participant.metric_x);
      this.yValues = data.challenge_participants.map((participant) => participant.metric_y);
      this.toolID = data.challenge_participants.map((participant) => participant.tool_id);
      this.allToolID = data.challenge_participants.map((participant) => participant.tool_id);

      this.dataPoints = data.challenge_participants.map((participant) => ([
        participant.metric_x,
        participant.metric_y,
      ]));

      // Calculate Pareto frontier
      let direction = this.formatOptimalDisplay(this.visualizationData.optimization);
      this.paretoPoints = pf.getParetoFrontier(this.dataPoints, { optimize: direction });

      const globalParetoTrace = {
        x: this.paretoPoints.map((point) => point[0]),
        y: this.paretoPoints.map((point) => point[1]),
        mode: 'lines',
        type: 'scatter',
        name: '<span style="color:black;">Global Pareto Frontier</span>',
        line: {
          dash: 'dot',
          width: 2,
          color: 'rgb(152, 152, 152)',
        },
      };

      const dynamicParetoTrace = {
        x: this.paretoPoints.map((point) => point[0]),
        y: this.paretoPoints.map((point) => point[1]),
        mode: 'lines',
        type: 'scatter',
        name: 'Dynamic Pareto Frontier',
        line: {
          dash: 'dot',
          width: 2,
          color: 'rgb(244, 124, 33)',
        }
      };

      // Add the pareto trace to the trace array
      traces.push(globalParetoTrace, dynamicParetoTrace);


      // Go through each object in challenge participants
      // Create traces
      for (let i = 0; i < data.challenge_participants.length; i++) {
        const participant = data.challenge_participants[i];

        const trace = {
          x: [participant.metric_x],
          y: [participant.metric_y],
          mode: 'markers',
          type: 'scatter',
          marker: {
              size: 14,
              symbol: this.getSymbol(),
              color: this.getColor()
          },
          name: participant.tool_id,
          showlegend: true,
          error_x: {
            type: 'data',
            array: [participant.stderr_x],
            visible: true,
            color: '#000000',
            width: 2,
            thickness: 0.3
              
          },
          error_y: {
            type: 'data',
            array: [participant.stderr_y],
            visible: true,
            color: '#000000',
            width: 2,
            thickness: 0.3
          },
        };
        traces.push(trace);
      }

      // Create the chart layout
      const layout = {
        autosize: true,
        height: 850,
        annotations: this.getOptimizationArrow(this.visualizationData.optimization),
        xaxis: {
          title: {
            text: this.visualizationData.x_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 18,
              color: 'black',
              weight: 'bold',
            },
          }
        },
        yaxis: {
          title: {
            text: this.visualizationData.y_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 18,
              color: 'black',
              weight: 'bold',
            },
          },
        },
        margin: { l: 60, r: 50, t: 80, b: 20, pad: 4 },
        legend: {
          orientation: 'h',
          x: 0,
          y: -0.2,
          xref: 'paper',
          yref: 'paper',
          font: {
            size: 16,
          }
        },
        // plot_bgcolor: '#F8F9F9',
        images: this.getImagePosition(this.visualizationData.optimization),
        showlegend: true
      };

      const config = {
        displayModeBar: false,
        responsive: true,
        hovermode: false
      };

      // ----------------------------------------------------------------
      // CREATE SCATTER PLOT
      const scatterPlot = Plotly.newPlot(this.$refs.chart, traces, layout, config);
      // ----------------------------------------------------------------

      // Get rangees from ejest graph
      scatterPlot.then(scatterPlot => {
        const layoutObj = scatterPlot.layout;
        this.optimalXaxis = layoutObj.xaxis.range;
        this.optimalYaxis = layoutObj.yaxis.range;
      });

      // Capture legend event
      // ----------------------------------------------------------------
      scatterPlot.then((gd) => {
        gd.on('plotly_legendclick', (event) => {
          let traceIndex = event.curveNumber;

          // If Pareto was clicked (index 0) do nothing
          if (traceIndex === 0) {
            return false;

          } else if (traceIndex === 1) {
            return true;
          }
          else {
            // Update the graph based on the selected trace
            // Si response es false la trace no se oculta de la legend
            let response = this.updatePlotOnSelection(traceIndex)
            if (response == false) {
                return false;
            }
          }
        });
      });


    },


    // ----------------------------------------------------------------
    // PARETO FRONTIER
    // ----------------------------------------------------------------
    // Function to format the optimal display direction
    formatOptimalDisplay(optimization) {
      switch (optimization) {
        case 'top-left':
          return ['min', 'max'];
        case 'top-right':
          return ['max', 'max'];
        case 'bottom-left':
          return ['min', 'min'];
        case 'bottom-right':
          return ['max', 'min'];
        default:
          return ['min', 'min'];
      }
    },
    
    // ----------------------------------------------------------------
    // UPDATE PLOT, INTERACTIONS
    // ----------------------------------------------------------------
    // Update the graph based on the selected trace
    updatePlotOnSelection(traceIndex) {
      traceIndex = traceIndex - 2;

      const toolHidden = this.dataPoints[traceIndex].hidden;

      if (!toolHidden) {
        const visibleTools = this.dataPoints.filter((tool) => !tool.hidden);
        if (visibleTools.length <= 4) {
          this.showMessageError = true;
          this.dismissCountDown = 5;

          const timer = setInterval(() => {
            if (this.dismissCountDown > 0) {
              this.dismissCountDown -= 1;
            } else {
              this.showMessageError = false;
              clearInterval(timer);
            }
          }, 1000);
          return false;
        }
      } else {
        this.showMessageError = false;
      }

      this.dataPoints[traceIndex].hidden = !toolHidden;

      const updatedVisibleTools = this.dataPoints.filter((tool) => !tool.hidden);

      let direction = this.formatOptimalDisplay(this.visualizationData.optimization);
      const newParetoPoints = pf.getParetoFrontier(updatedVisibleTools, { optimize: direction });

      const newTraces = { 
        x: [newParetoPoints.map((point) => point[0])], 
        y: [newParetoPoints.map((point) => point[1])] 
      };

      Plotly.update(this.$refs.chart, newTraces, {}, 1);
      // return true;
    },


    // ----------------------------------------------------------------
    // CLASSIFICATIONS
    // ----------------------------------------------------------------

    // NO CLASSIFICATION
    // ----------------------------------------------------------------
    noClassification(){
      this.viewKmeans = false;
      this.viewSquare = false;
      this.viewDiagonal = false;
      // this.showShapesKmeans = false;
      // this.showShapesSquare = false;
      // this.showAnnotationSquare = false;

       // Reset Plot
      const plot = document.getElementById('scatterPlot')
      if (plot && plot.data) {
        const numTraces = plot.data.length;
        const visibleArray = Array(numTraces).fill(true);

        // Reset Pareto Frontier
        this.dataPoints.forEach(array => { array.hidden = false; });
        const updatedVisibleTools = this.dataPoints.filter((tool) => !tool.hidden);
        let direction = this.formatOptimalDisplay(this.visualizationData.optimization);
        const newParetoPoints = pf.getParetoFrontier(updatedVisibleTools, { optimize: direction });

        // Update the trace of the Pareto frontier
        const newTraces = {
          x: [newParetoPoints.map((point) => point[0])],
          y: [newParetoPoints.map((point) => point[1])]
        };


        // Modificar despues
        // const layout = {
        //   shapes: false ? shapes : [],
        //   annotations: getOptimizationArrow(data.value.visualization.optimization)
        // };

        // Update only the trace data, without changing the layout
        Plotly.update(this.$refs.chart, newTraces, {}, 1);
        Plotly.restyle(this.$refs.chart, { visible: visibleArray });
      }
    },


    // ----------------------------------------------------------------
    // SCATTER PLOT VIEWS
    // ----------------------------------------------------------------
    // Toggle Visibility
    toggleView() {
      if (this.viewApplied) {
        this.optimalView();
      } else {
        this.resetView();
      }
    },
    // Optimal View (Optimal dimensions)
    optimalView() {
      const layout = {
        xaxis: {
          range: [this.optimalXaxis[0], this.optimalXaxis[1]],
          title: {
            text: this.visualizationData.x_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          }
        },
        yaxis: {
          range: [this.optimalYaxis[0], this.optimalYaxis[1]],
          title: {
            text: this.visualizationData.y_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          },
        },
      };
      Plotly.relayout(this.$refs.chart, layout);
      this.viewApplied = false; // Optimal view is applied
    },
    // Reset View (Real dimensions)
    resetView() {
      const layout = {
        xaxis: {
          range: [0, Math.max(...this.xValues) + (Math.min(...this.xValues) / 3)],
          title: {
            text: this.visualizationData.x_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          }
        },
        yaxis: {
          range: [0, Math.max(...this.yValues) + 0.05],
          title: {
            text: this.visualizationData.y_axis,
            font: {
              family: 'Arial, sans-serif',
              size: 16,
              color: 'black',
              weight: 'bold',
            },
          },
        }
      };
      Plotly.relayout(this.$refs.chart, layout);
      this.viewApplied = true;

    },


    // ----------------------------------------------------------------
    // LAYOUT CHART
    // ----------------------------------------------------------------
    // Color of the traces
    getColor() {
      const currentColor = this.markerColors[this.colorIndex];
      this.colorIndex = (this.colorIndex + 1) % this.markerColors.length;
      return currentColor;
    },
    // Symbol of the traces
    getSymbol() {
      const currentSymbol = this.symbols[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.symbols.length;
      return currentSymbol;
    },
    // This function creates the annotations for the optimization arrow
    getOptimizationArrow(optimization) {
      const arrowAnnotations = [];
      let arrowX, arrowY;
      let axAdjustment = 0;
      let ayAdjustment = 0;

      // Determine arrow position based on optimization
      switch (optimization) {
        case 'top-left':
          arrowX = 0;
          arrowY = 0.98;
          axAdjustment = 35;
          ayAdjustment = 30;
          break;

        case 'top-right':
          arrowX = 0.98;
          arrowY = 0.98;
          axAdjustment = -30;
          ayAdjustment = 35;
          break;

        case 'bottom-right':
          arrowX = 1;
          arrowY = 0;
          axAdjustment = -30;
          ayAdjustment = -30;
          break;

        default:
          // By default, place the arrow in the upper left corner
          arrowX = 0;
          arrowY = 0;
          axAdjustment = 30;
          ayAdjustment = -35;
      }

      // Crear la anotación para la flecha
      const arrowAnnotation = {
        x: arrowX,
        y: arrowY,
        xref: 'paper',
        yref: 'paper',
        text: 'Optimal corner',
        font: {
          color: '#6C757D'
        },
        showarrow: true,
        arrowhead: 3,
        ax: axAdjustment,
        ay: ayAdjustment,
        arrowsize: 1,
        arrowcolor: '#6C757D'
      };

      arrowAnnotations.push(arrowAnnotation);

      return arrowAnnotations;
    },
    // Image Position
    getImagePosition(optimization) {
      const ImagePositions = [];

      let positionX, positionY;

      // Posicion contraria
      switch (optimization) {
        case 'top-left':
          positionX = 1
          positionY = 0
          break;
        case 'top-right':
          positionX = 0.1
          positionY = 0
          break;
        case 'bottom-left':
          positionX = 1
          positionY = 0.9
          break;
        case 'bottom-right':
          positionX = 0.1
          positionY = 0.8
          break;
        default:
          positionX = 0.1
          positionY = 0
          break;
      }

      const imagesPosition = {
        x: positionX,
        y: positionY,
        sizex: 0.1,
        sizey: 0.3,
        source: "/2018.OpenEBench.logo.Manual_page2.png",
        xref: "paper",
        yref: "paper",
        xanchor: "right",
        yanchor: "bottom",
        "opacity": 0,
      }

      ImagePositions.push(imagesPosition)

      return ImagePositions

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
  },
  computed: {
    // Text for the View Button
    viewButtonText() {
      return this.viewApplied ? 'Optimal View' : 'Reset View';
    },
    // Text for the Classification Button
    classificationButtonText() {
      if (this.viewKmeans) {
        return 'K-Means Clustering';
      } else if (this.viewSquare) {
        return 'Square Quartiles';
      } else if (this.viewDiagonal){
        return 'Diagonal Quartiles';
      } else {
        return 'Classification'
      }
    }

  }
};
</script>

<style scoped>
.butns {
  position: absolute;
  top: 14px;
  margin-top: 10px;
  z-index: 1
}

.menu-item:hover {
  background-color: #f0f0f0;
  /* Change background color on hover */
  cursor: pointer;
  /* Change cursor on hover */
}

.custom-btn-toggle .v-btn:first-child {
  border-top-left-radius: 10px;
  /* Set rounded corner on top-left side of first button */
  border-bottom-left-radius: 10px;
  /* Set rounded corner on bottom-left side of first button */
}

.custom-btn-toggle .v-btn:last-child {
  border-top-right-radius: 10px;
  /* Set rounded corner on top-right side of last button */
  border-bottom-right-radius: 10px;
  /* Set rounded corner on bottom-right side of last button */
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th{
background-color: lightgray;
color: white;

}

.custom-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  text-align: center;
}

.custom-table .first-th {
  border-top-left-radius: 10px; /* Adjust the radius as needed */
  border-bottom-left-radius: 10px; /* Adjust the radius as needed */
}

.custom-table .last-td {
  border-top-right-radius: 10px; /* Adjust the radius as needed */
  border-bottom-right-radius: 10px; /* Adjust the radius as needed */
}
</style>
