(function() {
    //Show Login Form On Load
    $("div#login-modal").show();

    $("#loginButton").click(function() {
        FPX.loginFPX();
    });
})();

var FPX = (function(loadCallback) {

    var resultArray = [];
    var LOG = "";
    var BASE_URL = 'https://sbx.fpx.com/rs/15/cpq';
    var CURSOR_ID = '',
        BATCH_SIZE = 500;

    // constructs a URL to query FPX's Opportunity table using FPX REST Endpoint
    var constructFPXQuery = function() {
        return BASE_URL + "?query=" + encodeURIComponent($("#query").val()) + "&batchsize=" + BATCH_SIZE;
    };

    // constructs a URL to query FPX's Opportunity table using FPX REST Endpoint
    var getMoreData = function() {
        $("#msg1").html("");
        $(".alert").hide();
        var queryString = BASE_URL + "?cursor=" + CURSOR_ID;
        $.ajax({
            url: '/proxy?url=' + queryString,
            type: 'GET',
            contentType: 'application/json',
            success: function(data) {
                populateResult(data);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                // If the connection fails, log the error and return an empty set.
                tableau.log("Connection error: " + xhr.responseText + "\n" + thrownError);
                tableau.abortWithError("Error while trying to connecto to FPX API");
                $("#msg1").html(data.error);
                $(".alert").show();
            }
        });
    };

    var populateResult = function(data) {
        if (data.records) {
            var records = data.records;
            for (var i = 0; i < records.length; i++) {
                var row = {};
                var record = records[i];
                for (field in record) {
                    row[field] = record[field];
                }
                resultArray.push(row);
            }
            CURSOR_ID = data.cursorid;

            if (resultArray.length >= data.size) {
                $("#loading-mask").hide();
                loadCallback(resultArray);
            } else {
                getMoreData();
            }
        }
    };

    return {
        loadFPXData: function() {
            $.ajax({
                url: '/proxy?url=' + constructFPXQuery(),
                type: 'GET',
                contentType: 'application/json',
                success: function(data) {
                    populateResult(data);
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    // If the connection fails, log the error and return an empty set.
                    LOG = "Connection error: " + xhr.responseText + "\n" + thrownError;
                    $("#msg1").html(xhr.responseText);
                    $(".alert").show();
                }
            });
        },
        loginFPX: function() {
            //Prepare payload for FPX Login
            var payload = {
                username: $("#username").val(),
                password: $("#password").val()
            };
            $("#loading-mask").show();
            var LOGIN_URL = BASE_URL + '/login';
            //Make AJAX call to FPX Rest API
            var req = $.ajax({
                url: '/proxy?url=' + LOGIN_URL,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),

                success: function(data) {
                    if (data.success == true) {
                        $("div#login-modal").hide();
                        $("div#more-data").show();
                        $("#moreData").click(function() {
                            $("#loading-mask").show();
                            FPX.loadFPXData();
                        });
                        $("#loading-mask").hide();
                    } else {
                        $(".alert").show();
                        $("#msg").html(data.error);
                    }
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    // If the connection fails Display that to User
                    $("#msg").html("Error while trying to connecto to FPX Server");
                }
            });
        },
        testData: function(callback) {
            callback(JSON.parse(tableau.connectionData));
        },
        FPXResultSet: resultArray,
        FPX_LOG: LOG
    }
})(function(results, fieldNames, fieldTypes) {
    tableau.connectionData = JSON.stringify(results);
    tableau.submit();
});

var getArrayFromInput = function(eleId) {
    return document.getElementById(eleId).value.split(",").map(function(item) {
        return $.trim(item);
    });
};

var FPXConnector = tableau.makeConnector();

FPXConnector.init = function() {

    FPXConnector._recordsFetched = 0;
    tableau.connectionName = 'FPX Web Data Connector';
    tableau.initCallback();
};

FPXConnector.getColumnHeaders = function() {
    var fieldNames = getArrayFromInput('fieldNames');
    var fieldTypes = getArrayFromInput('dataTypes');
    tableau.headersCallback(fieldNames, fieldTypes);
};

FPXConnector.getTableData = function(lastRecordToken) {
    tableau.dataCallback(JSON.parse(tableau.connectionData), lastRecordToken, false);
};

tableau.registerConnector(FPXConnector);