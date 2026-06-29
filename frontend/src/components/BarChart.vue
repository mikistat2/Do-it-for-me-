<template>
  <Bar :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps<{
  labels: string[];
  values: number[];
  label?: string;
  color?: string;
}>();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      label: props.label ?? 'Count',
      data: props.values,
      backgroundColor: props.color ?? '#6366f1',
      borderRadius: 6,
    },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};
</script>
