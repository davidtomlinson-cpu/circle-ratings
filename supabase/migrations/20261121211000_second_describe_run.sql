-- A second description run, to pick up whatever the 05:47 run couldn't finish (busy sources, time limit).
select cron.schedule('world-trending-describe-2', '17 6 * * *', $$select private.refresh_world_trending('describe')$$);
