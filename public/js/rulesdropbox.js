$(document).ready(function () {
        $("#groups").change(function () {

            var group = $(this);
            var devicelistid = [];
            var devicelistname = [];
            console.log(group.val());
             $.ajax({
              url:'api/devices/',
              type:'GET',
              dataType:'json',
              success:(data) =>{
                for(var i = 0;i < data.response.length;i++){
                  if(data.response[i].groupid == group.val()){
                    devicelistid.push(data.response[i].DeviceID);
                    devicelistname.push(data.response[i].devicename);
                  }
                  
                }

                callback(devicelistid,devicelistname);
              }
            });

        });
    });
    function callback(dataid,dataname) {
    
    // Get select
    var select = document.getElementById('mySelect');
        select.options.length = 0;
        // Add options
        
      for (var i = 0;i < dataid.length;i++) {
        $(select).append('<option value=' + dataid[i] + '>' + dataname[i] + '</option>');
      }
      
        // Set selected value
        $(select).val(dataid[0]);
    }

function Validate()
      {
          var e = document.getElementById("groups");
          var strUser = e.options[e.selectedIndex].value;

          if(strUser==0)
          {
              alert("Please select a group");
          }
      }