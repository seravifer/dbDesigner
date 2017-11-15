var fs = require('fs');
var electron = require('electron').ipcRenderer;
const {dialog} = require('electron').remote;

$(function () {
    var originPosition;
    var data;

    electron.on('menuActions', (event, message) => {
        switch (message) {
            case "new":
                break;
            case "open":
                loadDB(dialog.showOpenDialog({
                    properties: ['openFile'],
                    filters: [{name: 'Database', extensions: ['json']}]
                }));
                break;
            case "save":
                saveDB();
                break;
            case "newTable":
                addTable("table");
                break;
            case "export":
                genrateSQL();
                break;
        }
    });

    $("#addTable").on("click", function () {
        var html = $("#new-table").clone();
        html.attr("id", "newTable");
        html.find(".name_table").text("New table");
        addTable("newTable");
        html.appendTo("main");
    });

    $("main")
        .on("click", ".cancel-insert, .cancel-table", function () {
            $(this).parent().hide();
            $(this).parent().prev().show();
        })

        .on("click", ".insert-field, .edit-table", function () {
            $(this).parent().hide();
            $(this).parent().next().show();
        })

        .on("click", ".delete-table", function () {
            var nameTable = $(this).parents("table").attr("id");
            deleteTable(nameTable);
            $(this).parents("table").remove();
        })

        .on("click", ".cancel-field", function () {
            var parent = $(this).parents("tr").eq(0);
            var items = [];
            items.push(parent.find("input[name='field-name']").val(),
                parent.find("select[name='field-type']").val(),
                parent.find("input[name='field-size']").val(),
                parent.find("input[name='field-default']").val(),
                parent.find("input[name='field-pk']").prop("checked"),
                parent.find("input[name='field-null']").prop("checked"),
                parent.find("input[name='field-unique']").prop("checked"),
                parent.find("input[name='field-ai']").prop("checked"));
            parent.attr("id", items[0]);
            var desc = "";
            if (items[4] === true) desc += "<i class='mdi mdi-key-variant' title='Primary key'></i>";
            if (items[5] === true) desc += "<i class='mdi mdi-do-not-disturb' title='Allow null'></i>";
            if (items[6] === true) desc += "<i class='mdi mdi-key-variant' title='Unique'></i>";
            if (items[7] === true) desc += "<i class='mdi mdi-playlist-plus' title='Autoincrement'></i>";
            parent.html("        <td>" + desc + "</td>\n" +
                "        <td>" + items[0] + "</td>\n" +
                "        <td>" + items[1] + "</td>\n" +
                "        <td class='rightmost'>\n" +
                "            <i class='mdi mdi-pencil edit-field'></i>\n" +
                "            <i class='mdi mdi-drag-vertical move-field'></i>\n" +
                "        </td>");
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
            html.find("input[name='field-fk']").attr("checked", fk);
            parent.html("<td colspan=\"4\">" + html.html() + "</td>");
        })

        .on("click", ".delete-field", function () {
            var parent = $(this).parents("tr").eq(0);
            var nameField = parent.attr("id");
            var nameTable = parent.parents("table").attr("id");
            deleteField(nameTable, nameField);
            parent.remove();
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

        .on("click", ".save-table", function () {
            var parent = $(this).parent();
            var oldName = $(this).parents("table").attr("id");
            var newName = parent.find("input[name='table-name']").val();
            var newComment = parent.find("textarea[name='table-comment']").val();
            $(this).parents("table").attr("id", newName);
            parent.find(".name_table").text(newName);
            editTable(oldName, newName, newComment);
            parent.find(".cancel-edit-table").click();
        })

        .on("DOMNodeInserted", ".draggable", function () {
            $(this).draggable({
                cursor: "move",
                stop: function () {
                    updatePos($(this).attr("id"), $(this).offset().left, $(this).offset().top);
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
        });

    loadDB("db.json");

    function createDB() {
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
                html.find("tbody").append("<tr id='" + data[i]['fields'][u].text + "'>" +
                    "        <td>" + desc + "</td>\n" +
                    "        <td>" + data[i]['fields'][u].text + "</td>\n" +
                    "        <td>" + data[i]['fields'][u].type + "</td>\n" +
                    "        <td class='rightmost'>\n" +
                    "            <i class='mdi mdi-pencil edit-field'></i>\n" +
                    "            <i class='mdi mdi-drag-vertical move-field'></i>\n" +
                    "        </td></tr>");
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

    function addField(nameTable, items) {
        var i = searchTable(nameTable);
        var obj = {text: items[0], type: items[1], pk: items[2], null: items[3], unique: items[4], ai: items[5]};
        data[i]['fields'].push(obj);
        saveDB();
    }

    function editField(nameTable, nameField, items) {
        var i = searchTable(nameTable);
        for (var u in data[i]["fields"]) {
            if (data[i]['fields'][u].text === nameField) {
                data[i]['fields'][u].text = items[0];
                data[i]['fields'][u].type = items[1];
                data[i]['fields'][u].size = items[2];
                data[i]['fields'][u].default = items[3];
                data[i]['fields'][u].pk = items[4];
                data[i]['fields'][u].null = items[5];
                data[i]['fields'][u].unique = items[6];
                data[i]['fields'][u].ai = items[7];
                saveDB();
            }
        }
    }

    function deleteField(nameTable, nameField) {
        var i = searchTable(nameTable);
        for (var u in data[i]["fields"]) {
            if (data[i]['fields'][u].text === nameField) {
                data[i]['fields'].splice(u, 1);
                saveDB();
            }
        }
    }

    function moveField(nameTable, oldPosition, newPosition) {
        if (oldPosition !== newPosition) {
            var i = searchTable(nameTable);
            var fields = data[i]["fields"];
            if (newPosition >= fields.length) {
                var k = newPosition - fields.length;
                while ((k--) + 1) fields.push(undefined);
            }
            fields.splice(newPosition, 0, fields.splice(oldPosition, 1)[0]);
            saveDB();
        }
    }


    function addTable(nameTable) {
        var obj = {name: nameTable, comment: "", posX: 100, posY: 100, fields: []};
        data.push(obj);
        saveDB();
    }

    function editTable(nameTable, newName, newComment) {
        var i = searchTable(nameTable);
        data[i].name = newName;
        data[i].comment = newComment;
        saveDB();
    }

    function deleteTable(nameTable) {
        var i = searchTable(nameTable);
        data.splice(i, 1);
        saveDB();
    }

    function updatePos(nameTable, posX, posY) {
        var i = searchTable(nameTable);
        data[i].posX = posX;
        data[i].posY = posY;
        saveDB();
    }

    function genrateSQL() {

    }

    function loadDB(pathDB) {
        data = "";
        $("main").empty();
        $.ajaxSetup({async: false});
        $.getJSON(pathDB, {}, function (result) {
            data = result;
        });
        $.ajaxSetup({async: true});
        createDB();
    }

    function saveDB() {
        fs.writeFileSync('db.json', JSON.stringify(data, null, 4));
    }

    function searchTable(nameTable) {
        for (var i in data) {
            if (data[i].name === nameTable) {
                return i;
            }
        }
    }

});
