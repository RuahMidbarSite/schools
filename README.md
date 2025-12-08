
# Guide:

1. Make sure to clear npm cache if you have :
npm cache clean --force
2. Go to AppData/Roaming and delete npm folder.

   -----------------------
   
3. Clone program.

4. Make sure you have working env file.

5. 
Important:
We use nested strategy (This is for both convenience and compability with packages that have problems with non-nested):
So you have three options:
1. npm install --install-strategy=nested
2. npm config set install-strategy nested + npm install
3. npm run install


