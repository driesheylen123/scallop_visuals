<script>
    import DetailsText from './DetailsText.svelte'
    import DetailsFigure from './DetailsFigure.svelte'

    export let datapoint;
</script>

<style>
    table {
        table-layout: fixed;
        width: 1200px;
    }
</style>

<h3>{datapoint.assay}</h3>
<table>
    <tr>
        <td><DetailsText datapoint={datapoint} /></td>
        <td><DetailsFigure datapoint={datapoint} /></td>
    </tr>
</table>