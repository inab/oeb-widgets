<template>
    <v-row>
    <v-col>
      <ScatterPlot v-if="dataChart && dataChart.inline_data.visualization.type == '2D-plot'" :dataJson="dataChart" />
      <BarPlot v-if="dataChart && dataChart.inline_data.visualization.type == 'bar-plot'" :dataJson="dataChart" />
      <BoxPlot v-if="dataChart && dataChart.inline_data.visualization.type == 'box-plot'" :dataJson="dataChart" />
    </v-col>
  </v-row>
</template>

<script>
import BarPlot from './BarPlot.vue';
import ScatterPlot from './ScatterPlot.vue';
import BoxPlot from './BoxPlot.vue';

export default {
    name: 'LoaderWidgets',
    components:{
      BarPlot, ScatterPlot, BoxPlot
    },
    props: {
      dataChart: {
        type: Object,
        required: true
      }
    },
}
</script>

