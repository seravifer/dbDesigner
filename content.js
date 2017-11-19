const fs = require("fs");
const pathElectron = require("path");
const electron = require("electron");
const ipc = require("electron").ipcRenderer;
const {dialog} = electron.remote;

$(function () {
    var originPosition;
    var data = [];
    var path;

    ipc.on("menuActions", (event, message) => {
        switch (message) {
            case "new":
                maySave();
                newDB();
                break;
            case "open":
                maySave();
                var newPath = dialog.showOpenDialog({
                    properties: ['openFile'],
                    filters: [{name: 'Database', extensions: ['json']}]
                });
                if (newPath !== undefined) loadDB(newPath[0]);
                break;
            case "save":
                saveDB();
                break;
            case "saveAs":
                saveAsDB();
                break;
            case "newTable":
                var html = $("#new-table").clone();
                html.attr("id", "newTable");
                html.find(".name_table").text("New table");
                addTable("newTable");
                html.appendTo("main");
                break;
            case "export":
                $(".modal").show();
                $(".code").text(generateSQL());
                break;
        }
    });

    function newDB() {
        path = undefined;
        data = [];
        $("main").empty().append("<canvas id='graph' class='canvas' width='3800' height='2400'></canvas>");
    }

    function loadDB(pathDB) {
        path = pathDB;
        data = [];
        $("main").empty();
        data = JSON.parse(fs.readFileSync(path, "utf8").toString());
        initView();
        setTimeout(function () { // Fucking problem, why!?
            writeCanvas();
        }, 1000);
    }

    function saveDB() {
        if (path === undefined) {
            path = dialog.showSaveDialog({
                defaultPath: "database.json"
            });
        }
        try {
            fs.writeFileSync(path, JSON.stringify(data, null, 4));
        } catch (err) {
        }
    }

    function saveAsDB() {
        var newPath = dialog.showSaveDialog({
            defaultPath: "database.json"
        });
        if (newPath !== undefined) {
            path = newPath;
            fs.writeFileSync(path, JSON.stringify(data, null, 4));
        }
    }

    function maySave() {
        if (checkSave()) {
            let answer = dialog.showMessageBox({
                type: "warning",
                title: "dbDesigner",
                message: "Want to save your changes?",
                buttons: ["Save", "Don't save"],
                noLink: true
            });
            if (answer === 0) saveDB();
        }
    }

    function checkSave() {
        var old = "";
        try {
            old = JSON.parse(fs.readFileSync(path, "utf8").toString());
        } catch (error) {
        }
        return JSON.stringify(data) !== JSON.stringify(old);
    }


    $("main")
        .on("click", ".insert-field, .edit-table", function () {
            $(this).parent().hide();
            $(this).parent().next().show();
        })

        .on("click", ".cancel-insert, .cancel-table", function () {
            $(this).parent().hide();
            $(this).parent().prev().show();
        })

        .on("click", ".save-table", function () {
            var parent = $(this).parent();
            var oldName = $(this).parents("table").attr("id");
            var newName = parent.find("input[name='table-name']").val();
            var newComment = parent.find("textarea[name='table-comment']").val();
            $(this).parents("table").attr("id", newName);
            editTable(oldName, newName, newComment);
            $(this).parents("th").find(".name_table").text(newName);
            parent.find(".cancel-table").click();
        })

        .on("click", ".delete-table", function () {
            var nameTable = $(this).parents("table").attr("id");
            deleteTable(nameTable);
            $(this).parents("table").remove();
        })

        .on("click", ".edit-field", function () {
            var parent = $(this).parents("tr").eq(0);
            var html = $("#new-table").find(".changes").clone();
            var nameField = parent.attr("id");
            var nameTable = parent.parents("table").attr("id");
            var result = getField(nameTable, nameField);
            html.append("<span class='action delete-field'><i class='mdi mdi-delete'></i>Delete</span>");
            html.find(".cancel-insert").removeClass("cancel-insert").addClass("cancel-field");
            html.find("input[name='field-name']").attr("value", result.text);
            html.find("select[name='field-type'] option[value='" + result.type + "']").attr("selected", "selected");
            html.find("input[name='field-size']").attr("value", result.size);
            html.find("input[name='field-default']").attr("value", result.default);
            html.find("input[name='field-pk']").attr("checked", result.pk);
            html.find("input[name='field-null']").attr("checked", result.null);
            html.find("input[name='field-unique']").attr("checked", result.unique);
            html.find("input[name='field-ai']").attr("checked", result.ai);
            var fk = result.foreign.length > 0;
            if (fk) {
                html.find(".refs").show();
                for (var i in data) {
                    html.find(".field-ref-table").append($("<option>", {
                        value: data[i].name,
                        text: data[i].name
                    }));
                }
                var t = searchTable(result.foreign[0]); // TODO BUG: nameTable could change
                for (var u in data[t]["fields"]) {
                    html.find(".field-ref-fields").append($("<option>", {
                        value: data[t]["fields"][u].text,
                        text: data[t]["fields"][u].text
                    }));
                }
                html.find(".field-ref-table option[value=" + result.foreign[0] + "]").attr("selected", "selected");
                html.find(".field-ref-table option[value=" + result.foreign[1] + "]").attr("selected", "selected");
            }
            html.find("input[name='field-fk']").attr("checked", fk);
            parent.html("<td colspan='4'><div class='changes'>" + html.html() + "</div></td>");
        })

        .on("click", ".save-insert", function () {
            var parent = $(this).parents("tr").eq(0);
            var nameField = parent.attr("id");
            var nameTable = parent.parents("table").attr("id");
            var items = [];
            items.push(parent.find("input[name='field-name']").val(),
                parent.find("select[name='field-type']").val(),
                parent.find("input[name='field-size']").val(),
                parent.find("input[name='field-default']").val(),
                parent.find("input[name='field-pk']").prop("checked"),
                parent.find("input[name='field-null']").prop("checked"),
                parent.find("input[name='field-unique']").prop("checked"),
                parent.find("input[name='field-ai']").prop("checked"));
            if (parent.find("input[name='field-fk']").prop("checked")) {
                items.push(parent.find(".field-ref-table").val(), parent.find(".field-ref-fields").val());
            }
            var desc = "";
            if (items[4] === true) desc += "<i class='mdi mdi-key-variant' title='Primary key'></i>";
            if (items[5] === true) desc += "<i class='mdi mdi-do-not-disturb' title='Allow null'></i>";
            if (items[6] === true) desc += "<i class='mdi mdi-key-variant' title='Unique'></i>";
            if (items[7] === true) desc += "<i class='mdi mdi-playlist-plus' title='Autoincrement'></i>";
            var html = "        <td>" + desc + "</td>\n" +
                "        <td>" + items[0] + "</td>\n" +
                "        <td>" + items[1] + "</td>\n" +
                "        <td class='rightmost'>\n" +
                "            <i class='mdi mdi-pencil edit-field'></i>\n" +
                "            <i class='mdi mdi-drag-vertical move-field'></i>\n" +
                "        </td>";
            if (nameField !== undefined) {
                editField(nameTable, nameField, items);
                parent.attr("id", items[0]);
                parent.html(html);
            } else {
                parent.parents("table").find("tbody").append("<tr id='" + items[0] + "'>" + html + "</tr>"); //.unwrap
                $(this).next().click();
                addField(nameTable, items);
            }
        })

        .on("click", ".cancel-field", function () {
            var parent = $(this).parents("tr").eq(0);
            var nameField = parent.attr("id");
            var nameTable = parent.parents("table").attr("id");
            var i = searchTable(nameTable);
            var u = searchField(i, nameField);
            var desc = "";
            if (data[i]['fields'][u].pk === true) desc += "<i class='mdi mdi-key-variant' title='Primary key'></i>";
            if (data[i]['fields'][u].null === true) desc += "<i class='mdi mdi-do-not-disturb' title='Allow null'></i>";
            if (data[i]['fields'][u].unique === true) desc += "<i class='mdi mdi-key-variant' title='Unique'></i>";
            if (data[i]['fields'][u].ai === true) desc += "<i class='mdi mdi-playlist-plus' title='Autoincrement'></i>";
            var types = data[i]['fields'][u].type;
            if (data[i]['fields'][u].size > 0) types += "(" + data[i]['fields'][u].size + ")";
            if (data[i]['fields'][u].default !== "") types += " [" + data[i]['fields'][u].default + "]";
            parent.html("        <td>" + desc + "</td>\n" +
                "        <td>" + data[i]['fields'][u].text + "</td>\n" +
                "        <td>" + types + "</td>\n" +
                "        <td class='rightmost'>\n" +
                "            <i class='mdi mdi-pencil edit-field'></i>\n" +
                "            <i class='mdi mdi-drag-vertical move-field'></i>\n" +
                "        </td>");
        })

        .on("click", ".delete-field", function () {
            var parent = $(this).parents("tr").eq(0);
            var nameField = parent.attr("id");
            var nameTable = parent.parents("table").attr("id");
            deleteField(nameTable, nameField);
            parent.remove();
        })

        .on("DOMNodeInserted", ".draggable", function () {
            $(this).draggable({
                cursor: "move",
                handle: "thead",
                drag: function () {
                    writeCanvas();
                },
                stop: function () {
                    updatePos($(this).attr("id"), $(this).offset().left, $(this).offset().top);
                    writeCanvas();
                }
            });
            $("tbody").sortable({
                handle: ".move-field",
                start: function (event, ui) {
                    originPosition = ui.item.index();
                },
                update: function (event, ui) {
                    moveField(ui.item.parents("table").attr("id"), originPosition, ui.item.index());
                }
            });
        })

        .on("click", "input[name='field-pk']", function () {
            var parent = $(this).parents("td").eq(0);
            if ($(this).is(":checked")) {
                parent.find("input[name='field-null']").prop("disabled", true).prop("checked", false);
                parent.find("input[name='field-unique']").prop("disabled", true).prop("checked", false);
                parent.find("input[name='field-ai']").prop("checked");
            } else {
                parent.find("input[name='field-null']").prop("disabled", false);
                parent.find("input[name='field-unique']").prop("disabled", false);
            }
        })

        .on("click", "input[name='field-fk']", function () {
            var parent = $(this).parents("td").first();
            if ($(this).is(":checked")) {
                parent.find(".refs").show();
                parent.find(".field-ref-table").empty();
                parent.find(".field-ref-fields").empty();
                for (var i in data) {
                    parent.find(".field-ref-table").append($("<option>", {
                        value: data[i].name,
                        text: data[i].name
                    }));
                }
                for (var u in data[0]["fields"]) {
                    parent.find(".field-ref-fields").append($("<option>", {
                        value: data[0]["fields"][u].text,
                        text: data[0]["fields"][u].text
                    }));
                }
            } else parent.find(".refs").hide();
        })

        .on("change", ".field-ref-table", function () {
            var parent = $(this).parents(".refs").first();
            parent.find(".field-ref-fields").empty();
            var nameTable = this.value;
            var i = searchTable(nameTable);
            for (var u in data[i]["fields"]) {
                parent.find(".field-ref-fields").append($("<option>", {
                    value: data[i]["fields"][u].text,
                    text: data[i]["fields"][u].text
                }));
            }
        })

        .on("click", function () {
            writeCanvas();
        });

    $(".modal")
        .on("click", ".close-modal", function () {
            $(".modal").hide();
        })
        .on("click", ".save-code", function () {
            var newPath = dialog.showSaveDialog({
                defaultPath: "database.sql"
            });
            if (newPath !== undefined) {
                fs.writeFileSync(newPath, generateSQL());
            }
        });


    function initView() {
        $("main").append("<canvas id='graph' class='canvas' width='3800' height='2400'></canvas>");
        for (var i in data) {
            var html = $("#new-table").clone();
            html.attr("id", data[i].name);
            html.css("left", data[i].posX + "px");
            html.css("top", data[i].posY + "px");
            html.show();
            html.find(".name_table").text(data[i].name);
            for (var u in data[i]["fields"]) {
                var desc = "";
                if (data[i]['fields'][u].pk === true) desc += "<i class='mdi mdi-key-variant' title='Primary key'></i>";
                if (data[i]['fields'][u].null === true) desc += "<i class='mdi mdi-do-not-disturb' title='Allow null'></i>";
                if (data[i]['fields'][u].unique === true) desc += "<i class='mdi mdi-key-variant' title='Unique'></i>";
                if (data[i]['fields'][u].ai === true) desc += "<i class='mdi mdi-playlist-plus' title='Autoincrement'></i>";
                var types = data[i]['fields'][u].type;
                if (data[i]['fields'][u].size > 0) types += "(" + data[i]['fields'][u].size + ")";
                if (data[i]['fields'][u].default !== "") types += " [" + data[i]['fields'][u].default + "]";
                html.find("tbody").append("<tr id='" + data[i]['fields'][u].text + "'>" +
                    "        <td>" + desc + "</td>\n" +
                    "        <td>" + data[i]['fields'][u].text + "</td>\n" +
                    "        <td>" + types + "</td>\n" +
                    "        <td class='rightmost'>\n" +
                    "            <i class='mdi mdi-pencil edit-field'></i>\n" +
                    "            <i class='mdi mdi-drag-vertical move-field'></i>\n" +
                    "        </td>" +
                    "</tr>");
            }
            html.appendTo("main");
        }
    }


    function getField(nameTable, nameField) {
        var i = searchTable(nameTable);
        for (var u in data[i]["fields"]) {
            if (data[i]['fields'][u].text === nameField) return data[i]['fields'][u];
        }
    }

    function searchField(indexTable, nameField) {
        for (var u in data[indexTable]["fields"]) {
            if (data[indexTable]['fields'][u].text === nameField) return u;
        }
    }

    function addField(nameTable, items) {
        var i = searchTable(nameTable);
        var obj = {
            text: items[0],
            type: items[1],
            size: parseInt(items[2]),
            default: items[3],
            pk: items[4],
            null: items[5],
            unique: items[6],
            ai: items[7],
        };
        if (items.length > 8) {
            obj.foreign = [items[8], items[9]];
        } else obj.foreign = [];
        data[i]['fields'].push(obj);
    }

    function editField(nameTable, nameField, items) {
        var i = searchTable(nameTable);
        for (var u in data[i]['fields']) {
            if (data[i]['fields'][u].text === nameField) {
                data[i]['fields'][u].text = items[0];
                data[i]['fields'][u].type = items[1];
                data[i]['fields'][u].size = parseInt(items[2]);
                data[i]['fields'][u].default = items[3];
                data[i]['fields'][u].pk = items[4];
                data[i]['fields'][u].null = items[5];
                data[i]['fields'][u].unique = items[6];
                data[i]['fields'][u].ai = items[7];
                if (items.length > 8) {
                    data[i]['fields'][u].foreign = [items[8], items[9]];
                } else data[i]['fields'][u].foreign = [];
            }
        }
    }

    function deleteField(nameTable, nameField) {
        var i = searchTable(nameTable);
        for (var u in data[i]['fields']) {
            if (data[i]['fields'][u].text === nameField) {
                data[i]['fields'].splice(u, 1);
            }
        }
    }

    function moveField(nameTable, oldPosition, newPosition) {
        if (oldPosition !== newPosition) {
            var i = searchTable(nameTable);
            var fields = data[i]['fields'];
            if (newPosition >= fields.length) {
                var k = newPosition - fields.length;
                while ((k--) + 1) fields.push(undefined);
            }
            fields.splice(newPosition, 0, fields.splice(oldPosition, 1)[0]);
        }
    }

    function getForignkey(nameTable) {
        var items = [];
        var i = searchTable(nameTable);
        for (var u in data[i]['fields']) {
            if (data[i]['fields'][u].pk === true) items.push(data[i]['fields'][u].name)
        }
        return items;
    }


    function searchTable(nameTable) {
        for (var i in data) {
            if (data[i].name === nameTable) {
                return i;
            }
        }
    }

    function addTable(nameTable) {
        var obj = {name: nameTable, comment: "", posX: 100, posY: 100, fields: []};
        data.push(obj);
    }

    function editTable(nameTable, newName, newComment) {
        var i = searchTable(nameTable);
        data[i].name = newName;
        data[i].comment = newComment;
    }

    function deleteTable(nameTable) {
        var i = searchTable(nameTable);
        data.splice(i, 1);
    }

    function updatePos(nameTable, posX, posY) {
        var i = searchTable(nameTable);
        data[i].posX = posX;
        data[i].posY = posY;
    }


    function generateSQL() {
        var result = "";
        for (var i in data) {
            result += "CREATE TABLE `" + data[i].name + "` (";
            for (var u in data[i]['fields']) {
                result += "\n\t`" + data[i]['fields'][u].text + "` " + data[i]['fields'][u].type;
                if (data[i]['fields'][u].size > 0) result += "(" + data[i]['fields'][u].size + ")";
                if (data[i]['fields'][u].default !== "") result += " DEFAULT '" + data[i]['fields'][u].default + "'";
                if (data[i]['fields'][u].ai === true) result += " AUTO_INCREMENT";
                if (data[i]['fields'][u].null === false) result += " NOT NULL";
                if (data[i]['fields'][u].unique === true) result += " UNIQUE";
                if (data[i]['fields'][u].text !== data[i]['fields'][data[i]['fields'].length - 1].text) result += ",";
                if (data[i]['fields'][u].pk === true) result += "\n\tPRIMARY KEY (`" + data[i]['fields'][u].text + "`),";
            }
            result += "\n);\n";
        }
        return result;
    }

    function writeCanvas() {
        var canvas = document.getElementById("graph");
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";

        for (var i in data) {
            for (var u in data[i]['fields']) {
                if (data[i]['fields'][u]['foreign'].length > 0) {
                    var P1 = $("#" + data[i].name).find("#" + data[i]['fields'][u].text);
                    var P2 = $("#" + data[i]['fields'][u]['foreign'][0]).find("#" + data[i]['fields'][u]['foreign'][1]);

                    var posP1 = P1.offset();
                    var posP2 = P2.offset();

                    var posP1right = posP1.left + P1.outerWidth();
                    var posP2right = posP2.left + P2.outerWidth();

                    ctx.beginPath();
                    if (posP1.left > posP2right) { // P1 < P2
                        console.log("P1 < P2");
                        posP2.left = posP2right;
                        let middle = (posP1.left + posP2.left) / 2;
                        ctx.moveTo(posP2.left + 15, posP2.top + 15);
                        ctx.bezierCurveTo(middle, posP2.top + 15, middle, posP1.top + 15, posP1.left, posP1.top + 15);
                        drawArrow(ctx, posP2.left +15, posP2.top + 15, 180);
                    } else if (posP2.left > posP1right) { // P1 > P2
                        console.log("P1 > P2");
                        posP1.left = posP1right;
                        let middle = (posP1.left + posP2.left) / 2;
                        ctx.moveTo(posP1.left, posP1.top + 15);
                        ctx.bezierCurveTo(middle, posP1.top + 15, middle, posP2.top + 15, posP2.left-15, posP2.top + 15);
                        drawArrow(ctx, posP2.left -15, posP2.top + 15, 0);
                    } else { // P1 = P2
                        console.log("P1 = P2");
                        ctx.moveTo(posP1.left, posP1.top + 15);
                        ctx.bezierCurveTo(posP1.left - 200, posP1.top + 15, posP2.left - 200, posP2.top + 15, posP2.left-15 , posP2.top + 15);
                        drawArrow(ctx, posP2.left -15, posP2.top + 15, 0);
                    }
                    console.log("PosP1: " + posP1.left + "x - " + posP1.top + "y - " + posP1right +
                        "\nPosP2: " + posP2.left + "x - " + posP2.top + "y - " + posP2right);
                }
            }
        }

    }

    function drawArrow(ctx, x, y, t) {
        ctx.stroke();
        ctx.beginPath();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t*Math.PI/180);
        ctx.moveTo(0,0);
        ctx.lineTo(0,-6);
        ctx.lineTo(16,0);
        ctx.lineTo(0,6);
        ctx.lineTo(0,0);
        ctx.fill();
        ctx.restore();
    }

    window.onbeforeunload = (e) => {
        e.returnValue = false;
        if (checkSave()) {
            var answer = dialog.showMessageBox({
                type: "warning",
                title: "dbDesigner",
                message: "Want to save your changes?",
                buttons: ["Save", "Don't save", "Cancel"],
                noLink: true
            });
            if (answer === 0) {
                saveDB();
                electron.remote.getCurrentWindow().destroy();
            } else if (answer === 1) {
                electron.remote.getCurrentWindow().destroy();
            }
        } else electron.remote.getCurrentWindow().destroy();
    };

    require(pathElectron.resolve('./contextmenu'));

    loadDB("db.json"); // DevTool

});
