
var base_url = "http://co.opencampaigndata.org";

module.exports = function() {
  return {
    resources: [{
      name: "contributions",
      links: [{
        json: base_url + "v1/contributions.json",
        csv: base_url + "v1/contributions.csv",
      }]
    },
    {
      name: "loans",
      links: [{
        json: base_url + "v1/loans.json",
        csv: base_url + "v1/loans.csv",
      }]
    },
    {
      name: "expenditures",
      links: [{
        json: base_url + "v1/expenditures.json",
        csv: base_url + "v1/expenditures.csv",
      }]
    },
    ]
  }
}
