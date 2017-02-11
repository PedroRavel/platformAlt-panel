# **Grafana Platform Alternate Panel**
## Monitor Health of Platform in Grafana

Determines health of platform based on platform queries. Throws alert when any query is in warning/critical state. Warning and Critical states determined by value going over specified thresholds. Query state is based on threshold.

## Features

- Calculates multiple queries per platform to determine health.
- Thresholds can be set for each individual query.
- Can set label and change label names of each individual query (labels set to true will be ignored during calculation). Query with label set will be displayed on panel.

## Notes
Each query **MUST** have an alias set.
