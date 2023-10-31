<script>
    export let datapoint;
</script>

<table>
    <tr><td>assay</td><td>{datapoint.assay}</td></tr>
    <tr><td>sd_threshold</td><td>{datapoint.sd_threshold}</td></tr>
    <tr><td>severe_sepsis_outcome_average</td><td>{datapoint.severe_sepsis_outcome_average}</td></tr>
    <tr><td>IAF_normals</td><td>{datapoint.IAF_normals}</td></tr>
    <tr><td>IAF_lowerbound</td><td>{datapoint.IAF_lowerbound}</td></tr>
    <tr><td>IAF_upperbound</td><td>{datapoint.IAF_upperbound}</td></tr>
    <tr><td>abs_difference_sepsissevere_IAF</td><td>{datapoint.abs_difference_sepsissevere_IAF}</td></tr>
    <tr><td>lower_for_baseline_0</td><td>{datapoint.lower_for_baseline_0}</td></tr>
    <tr><td>upper_for_baseline_0</td><td>{datapoint.upper_for_baseline_0}</td></tr>
    <tr><td>difference_sepsissevere_IAF</td><td>{datapoint.difference_sepsissevere_IAF}</td></tr>
</table>
