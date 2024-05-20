<template>
    <v-container>
    <v-row>
      <v-col cols="8">
        <div class="butns">

          <!-- Buttons -->
          <v-btn-toggle class="custom-btn-toggle">
            <v-btn outlined>
              Sort & Classify Data
            </v-btn outlined>
            <v-btn>
              Optimal View
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
                  <v-list-item-title>SVG</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item">
                  <v-list-item-title>PNG</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item class="menu-item">
                  <v-list-item-title>PDF</v-list-item-title>
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

export default {
  name: 'ScatterPlot',
  props: {
    dataJson: {
      type: Object,
      required: true
    }
  },
  mounted() {
    // Renderizar el scatter plot cuando el componente se monta
    this.renderChart();
  },
  methods: {
    renderChart() {
      const plotData = [this.dataJson]; // Asegúrate de que los datos estén en un array

      const layout = {
        title: 'Scatter Plot',
        xaxis: {
          title: 'X Axis'
        },
        yaxis: {
          title: 'Y Axis'
        }
      };

      // Configurar el scatter plot
      Plotly.newPlot(this.$refs.chart, plotData, layout);
    }
  }
};
</script>

<style scoped>
/* Estilos específicos del componente */
</style>
