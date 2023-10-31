<script>
	import Viz1 from './Viz1.svelte';
	import Papa from 'papaparse';

	let datapoints = [];
	Papa.parse("test.csv", {
		header: true,
		download: true,
		dynamicTyping: true,
		complete: function(results) {
			datapoints = results.data
		}
	})

	$: console.log(datapoints)

</script>


<Viz1 datapoints={datapoints}/>