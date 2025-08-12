run manual update on upcoming tourney

0. npm install

1. npm run prisma:studio

1. npm run update:tournament <new tourney id>
   -- "startTime": cutoff for league list
   -- "endTime": countdown

1. Update description, deploy

1. -- flip "manualActive"
   npm run update:profiles
   npm run clean:team-players
