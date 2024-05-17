<template>
    <v-row justify="center" align="center">
    <v-col>
      <ScatterPlot v-if="data[0].type == 'scatter'" :data="data" />
      <BarPlot v-if="data[0].type == 'bar'" :data="data" />
      
    </v-col>
  </v-row>
</template>

<script>
export default {
    name: 'LoaderWidgets',
    props: {
      data: {
        type: Array,
        required: true
      }
    },
}
</script>

