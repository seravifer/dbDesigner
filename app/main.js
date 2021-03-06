const {app, BrowserWindow, Menu} = require('electron');
const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({width: 1400, height: 1000});

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Open the DevTools.
    win.webContents.openDevTools();

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    });

    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New', click() {
                        win.webContents.send('menuActions', 'new')
                    }, accelerator: "CmdOrCtrl+N"
                },
                {
                    label: 'Open', click() {
                        win.webContents.send('menuActions', 'open')
                    }, accelerator: "CmdOrCtrl+O"
                },
                {
                    label: 'Save', click() {
                        win.webContents.send('menuActions', 'save')
                    }, accelerator: "CmdOrCtrl+S"
                },
                {
                    label: 'Save As...', click() {
                        win.webContents.send('menuActions', 'saveAs')
                    }, accelerator: "CmdOrCtrl+Shift+S"
                },
                {type: 'separator'},
                {role: 'close'}
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Add table', click() {
                        win.webContents.send('menuActions', 'newTable')
                    }, accelerator: "CmdOrCtrl+T"
                },
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                {type: 'separator'},
                {role: 'undo', enabled: 'false'},
                {role: 'redo', enabled: 'false'},
            ]
        },
        {
            label: 'View',
            submenu: [
                {role: 'zoomin'},
                {role: 'zoomout'},
                {role: 'resetzoom'},
                {type: 'separator'},
                {role: 'togglefullscreen'}
            ]
        },
        {
            label: "Export",
            click() {
                win.webContents.send('menuActions', 'export')
            }, accelerator: "CmdOrCtrl+Q"
        },
        {
            label: 'About'
        }

    ];
    /*
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                {role: 'about'},
                {type: 'separator'},
                {role: 'services', submenu: []},
                {type: 'separator'},
                {role: 'hide'},
                {role: 'hideothers'},
                {role: 'unhide'},
                {type: 'separator'},
                {role: 'quit'}
            ]
        })

        // Edit menu
        template[1].submenu.push(
            {type: 'separator'},
            {
                label: 'Speech',
                submenu: [
                    {role: 'startspeaking'},
                    {role: 'stopspeaking'}
                ]
            }
        )

        // Window menu
        template[3].submenu = [
            {role: 'close'},
            {role: 'minimize'},
            {role: 'zoom'},
            {type: 'separator'},
            {role: 'front'}
        ]
    }
    */
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
});