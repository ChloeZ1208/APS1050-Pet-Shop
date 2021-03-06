ElectionApp = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: async function() {
    return await ElectionApp.initWeb3();
  },

  initWeb3: async function() {

    if (window.ethereum) {
      ElectionApp.web3Provider = window.ethereum;
      await window.ethereum.enable();
      web3 = new Web3(ElectionApp.web3Provider);
      return ElectionApp.initContract();
    }
    else {
      ElectionApp.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(ElectionApp.web3Provider);
      return ElectionApp.initContract();
    }
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      ElectionApp.contracts.Election = TruffleContract(election);
      ElectionApp.contracts.Election.setProvider(ElectionApp.web3Provider);
      ElectionApp.listenForEvents();
      return ElectionApp.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    ElectionApp.contracts.Election.deployed().then(function(instance) {
      instance.votedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("vote triggered", event)
        ElectionApp.render();
      });

      instance.registeredEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("register triggered", event)
        // Reload when a new register is recorded
        ElectionApp.render();
      });
    });
  },

  render: function() {
    var electionInstance;

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        ElectionApp.account = account;
        $("#accountAddress").html("Address: " + account);
        web3.eth.getBalance(account, function(err, balance) {
          if (err === null) {
            $("#accountBalance").html("Balance: " + web3.fromWei(balance, "Ether") + " ETH");
          }
        })
      }
    })

    ElectionApp.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      var candArray = [];
      for (var i = 1; i <= candidatesCount; i++) {
      candArray.push(electionInstance.candidates(i));
      } 
      Promise.all(candArray).then(function(values) {
        var candidatesResults = $("#candidatesResults");
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        var candidateRegisterImg = $('#candidatesRegisterImg'); 
        candidatesSelect.empty();
        candidateRegisterImg.empty();

        for (var i = 0; i < candidatesCount; i++) {
        var id = values[i][0];
        var petName = values[i][1];
        var petBreed = values[i][2];
        var petAge = values[i][3];
        var petLoc = values[i][4];
        var petImg = values[i][5];
        var voteCount = values[i][6];

        // Render candidate Result
        var candidateTemplate = "<tr><th>" + i + "</th><td>" + petName + "</td><td>" + petBreed + "</td><td>" + petAge + "</td><td>" + petLoc + "</td><td><img src="+petImg+" alt=\"\" class=\"img-rounded img-center\" border=3 height=100 width=100></img></td><td>" + voteCount + "</td></tr>";
        candidatesResults.append(candidateTemplate);

        // Render candidate ballot option
        var candidateOption = "<option value='" + id + "' >" + petName + "</ option>"
        candidatesSelect.append(candidateOption);
      }
      $.getJSON('../images.json', function(data) {  
        for (i = 0; i < data.length; i ++) {
          var option = "<option value='" + i + "' >" + data[i].name + "</ option>"
          candidateRegisterImg.append(option);
        }
      });
    });
    return electionInstance.voters(ElectionApp.account);
    }).then(function(hasVoted) {
      // user are only allowed to vote once
      if(hasVoted) {
        $('form#voteForm').hide();
      } else {
        $('form#voteForm').show();
      }
      return electionInstance.regList(ElectionApp.account);
    }).then(function() {
    }).catch(function(err) {
      console.warn(err);
    });
    },

  castVote: function() {
    var candidateId = $('#candidatesSelect').val();
    ElectionApp.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: ElectionApp.account });
    }).then(function(result) {
    }).catch(function(err) {
      console.error(err);
    });
  },

  castRegister: function() {
    var regName = $('#candidatesRegisterName').val();
    var regBreed = $('#candidatesRegisterBreed').val();
    var regAge = $('#candidatesRegisterAge').val();
    var regLoc = $('#candidatesRegisterLoc').val();
    var regImgId = $('#candidatesRegisterImg').val();
    ElectionApp.contracts.Election.deployed().then(function(instance) {
      $.getJSON('../images.json', function(data) {  
        return instance.register(regName, regBreed, regAge, regLoc, data[regImgId].img, { from: ElectionApp.account });
      })
    }).then(function(result) {
      // register update
      window.open('./election.html');
      window.close();
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    ElectionApp.init();
  });
});
