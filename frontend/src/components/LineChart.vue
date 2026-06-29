<template>
  <Line :data="chartData" :options="options" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
);

const props = defineProps<{
  labels: string[];
  series: Array<{ label: string; values: number[]; color: string }>;
}>();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((item) => ({
    label: item.label,
    data: item.values,
    borderColor: item.color,
    backgroundColor: `${item.color}33`,
    fill: true,
    tension: 0.35,
    pointRadius: 2,
  })),
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};
</script>
