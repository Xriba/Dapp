function endSession(){
  ls.clearStorage()
}
window.onbeforeunload = function() {
  endSession();
 }



function step2(authorized){
  if(authorized){
    $("#notAuthorized").hide()
    $("#walletSelectionBox").show()
    $( "a" ).focus();
    $("#kycNote").hide()
    $("#ethAddressCheck").hide()

    localStorage.setItem("ethAddress", $('#ethAddress input').val());

    // TODO passing data from localstorage and set the amount dinamic from user input
    if(localStorage.getItem("wallet")=="coincrowd"){
      $("#coincrowdQR_box").show()
      setCoinCrowdQr()
    }

  }else{
    console.log("NOT Authorized !!!");
    localStorage.removeItem("ethAddress")
    $( "a" ).focus();
    $("#notAuthorized").show()
    $("#kycNote").show()
    $("#ethAddressCheck").show()
    $("#ethAddressSelected").hide()

    $("#coincrowdQR_box").hide()
    //
  }
}





function setCoinCrowdQr(eth,data){
  var ethAddress = $("#ethAddress input").val()
  var data = "" // TODO get from API IcoEngine


  CoinCrowdQR({
    address: contractAddress,
    value: eth,
    gas: 250000,
    data: data
  })
}



$(function() {

  $('#ethAddress input').on('keyup input propertychange paste change', function(e) {
    //var wallet = ls.getWallet()
    $('#ethAddress input').val($('#ethAddress input').val().trim())
    var urlIcoEngine = "https://eidoo-api-1.eidoo.io/api/ico/" + contractAddress + "/authorization/" + $('#ethAddress input').val()
    console.log("url",urlIcoEngine);

    //$("#scanEtherAddress").html('Get the qr code to send TX');
    if(!web3.isAddress($("#ethAddress input").val())){
      console.log("Address not valid");
      $("#ethAddress .ok").hide()
      $("#ethAddress .err").show()
      $("#notAuthorized").hide()

    }else{
      //Address is correct!
      $("#ethAddress .err").hide()
      $("#ethAddress .ok").show()

      //Call the IcoEngine API
      $(".overlay").show()
      $.ajax({
        url: urlIcoEngine,
        cache: false,
        success: function(result){
          $(".overlay").hide()
          console.log(result);
          if(result && result.authorized){
            //Ethereum address is authorized
            step2(true)
          }else{
            //Ethereum address is NOT authorized
            //0x4c192975263c0054f04279ac9b9f58095f3e2456
            //0x8f3ef3d07834056a22f08f153b3116f340392c77
            // TODO remove this if is just for test
            if($("#ethAddress input").val()=="0x8f3ef3d07834056a22f08f153b3116f340392c77"){
                step2(false)
            }else{
                step2(false) //TODO: now passing true to test step2 but in production need to pass false
            }

          }
        }
      });

    }
  });



  $("#changeEthAddress").on("click", function(e){
    e.preventDefault()
    localStorage.removeItem("ethAddress")
    $('#ethAddress input').val("")
    $("#ethAddressSelected").hide()
    $("#notAuthorized").show()
    $("#walletSelectionBox").hide()
    $("#kycNote").show()
    $("#ethAddressCheck").show()

    $("#ethAddress .ok").hide()
    $("#ethAddress .err").hide()
    $("#notAuthorized").hide()
  });

  $(".changeCurrentWallet").on("click", function(){
    var wallet = ls.getWallet()
    localStorage.removeItem("wallet")
    $(".walletSelection").show()
    $(".currentWallet." + wallet).fadeOut()
    $("#" + wallet).hide()
    if(!localStorage.getItem("ethAddress")){
      $("#ethAddressCheck").hide()
    }


  });

});
