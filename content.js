var fs = require('fs');

$(function () {
    var originalPosition;
    var data;

    $("#addTable").on("click", function () {
        var html = $("#new-table").clone();
        html.attr("id", "newTable");
        html.find(".name_table").text("New table");
        addTable("newTable");
        html.appendTo("main");
    });

    $("main")
        .on("click", ".cancel-insert, .cancel-edit-table", function () {
            $(this).parent().hide();
            $(this).parent().prev().show();
        })

        .on("click", ".cancel-field", function () {
            var parent = $(this).parents("tr").eq(0);
            var items = [];
            items.push(parent.find("input[name='field-name']").val());
            items.push(parent.find("select[name='field-type']").val());
            items.push(parent.find("input[name='field-pk']").prop('checked'));
            items.push(parent.find("input[name='field-null']").prop('checked'));
            items.push(parent.find("input[name='field-unique']").prop('checked'));
            items.push(parent.find("input[name='field-ai']").prop('checked'));
            parent.attr("id", items[0]);
            parent.html("        <td class=\"\"></td>\n" +
                "        <td>" + items[0] + "</td>\n" +
                "        <td>" + items[1] + "</td>\n" +
                "        <td class=\"rightmost\">\n" +
                "            <span class=\"edit-field\">E</span>\n" +
                "            <span class=\"mover\">M</span>\n" +
                "        </td>");
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

        .on("click", ".edit-field", function () {
            var parent = $(this).parents("tr").eq(0);
            var html = $("#new-table .changes").clone();
            var nameField = parent.attr("id");
            var nameTable = parent.parents("table").attr("id");
            getField(nameTable, nameField, function (data) {
                html.append("<span class=\"delete-field\">Delete</span>");
                html.find(".cancel-insert").removeClass("cancel-insert").addClass("cancel-field");
                html.find("input[name='field-name']").attr("value", data.text);
                html.find("select[name='field-type'] option[value='" + data.type + "']").attr("selected", "selected");
                html.find("input[name='field-pk']").attr('checked', data.pk);
                html.find("input[name='field-null']").attr('checked', data.null);
                html.find("input[name='field-unique']").attr('checked', data.unique);
                html.find("input[name='field-ai']").attr('checked', data.ai);
                parent.html("<td colspan=\"4\">" + html.html() + "</td>");
            });
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
                parent.find("input[name='field-pk']").prop('checked'),
                parent.find("input[name='field-null']").prop('checked'),
                parent.find("input[name='field-unique']").prop('checked'),
                parent.find("input[name='field-ai']").prop('checked'));
            if (nameField !== undefined) {
                editField(nameTable, nameField, items);
                parent.attr("id", items[0]);
                parent.html("        <td class=\"\"></td>\n" +
                    "        <td>" + items[0] + "</td>\n" +
                    "        <td>" + items[1] + "</td>\n" +
                    "        <td class=\"rightmost\">\n" +
                    "            <span class=\"edit-field\">E</span>\n" +
                    "            <span class=\"mover\">M</span>\n" +
                    "        </td>");
            } else {
                parent.parents("table").find("tbody").append("<tr id=\"" + items[0] + "\">" +
                    "        <td class=\"\"></td>\n" +
                    "        <td>" + items[0] + "</td>\n" +
                    "        <td>" + items[1] + "</td>\n" +
                    "        <td class=\"rightmost\">\n" +
                    "            <span class=\"edit-field\">E</span>\n" +
                    "            <span class=\"mover\">M</span>\n" +
                    "        </td></tr>");
                $(this).next().click();
                addField(nameTable, items);
            }

        })

        .on("click", ".save-edit-table", function () {
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
                stop: function () {
                    updatePos($(this).attr("id"), $(this).offset().left, $(this).offset().top);
                }
            });
            $("tbody").sortable({
                handle: ".mover",
                start: function (event, ui) {
                    originalPosition = ui.item.index();
                },
                update: function (event, ui) {
                    moveField(ui.item.parents("table").attr("id"), originalPosition, ui.item.index());
                }
            });
        });

    loadDB();
    createDB();

    function createDB() {
        for (var i in data) {
            var html = $("#new-table").clone();
            html.attr("id", data[i].name);
            html.css("left", data[i].posX + "px");
            html.css("top", data[i].posY + "px");
            html.show();
            html.find(".name_table").text(data[i].name);
            for (var u in data[i]["fields"]) {
                html.find("tbody").append("<tr id=\"" + data[i]['fields'][u].text + "\">" +
                    "        <td class=\"\"></td>\n" +
                    "        <td>" + data[i]['fields'][u].text + "</td>\n" +
                    "        <td>" + data[i]['fields'][u].type + "</td>\n" +
                    "        <td class=\"rightmost\">\n" +
                    "            <span class=\"edit-field\">E</span>\n" +
                    "            <span class=\"mover\">M</span>\n" +
                    "        </td></tr>");
            }
            html.appendTo("main");
        }
    }


    function getField(nameTable, nameID, callback) {
        var i = searchTable(nameTable);
        for (var u in data[i]["fields"]) {
            if (data[i]['fields'][u].text === nameID) callback(data[i]['fields'][u]);
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
                console.log(items);
                data[i]['fields'][u].text = items[0];
                data[i]['fields'][u].type = items[1];
                data[i]['fields'][u].pk = items[2];
                data[i]['fields'][u].null = items[3];
                data[i]['fields'][u].unique = items[4];
                data[i]['fields'][u].ai = items[5];
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
                while ((k--) + 1) {
                    fields.push(undefined);
                }
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

    function loadDB() {
        $.ajaxSetup({async: false});
        $.getJSON("db.json", {}, function (result) {
            data = result;
        });
    }

    function saveDB() {
        fs.writeFileSync('db.json', JSON.stringify(data));
    }

    function searchTable(nameTable) {
        for (var i in data) {
            if (data[i].name === nameTable) {
                return i;
            }
        }
    }

});
