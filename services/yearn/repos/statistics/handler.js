'use strict';

const dynamodb = require('../../../../utils/dynamoDb');
const _ = require('lodash');

const db = dynamodb.doc;

const getRepos = async () => {
  const params = {
    TableName: 'repos',
  };
  const entries = await db.scan(params).promise();
  const repos = entries.Items;
  return repos;
};

exports.handler = async () => {
  const repos = await getRepos();
  const contributorMap = {};

  const contributorEntries = _.union(
    ..._.map(repos, (repo) => repo.contributors),
  );

  const updateContributor = (contributor) => {
    const { login } = contributor;
    let { contributions = 0 } = contributor;
    const foundContributor = contributorMap[login];
    if (foundContributor) {
      const { contributions: previousContributions } = foundContributor;
      contributions += previousContributions;
      contributor.contributions = contributions;
    }
    contributorMap[login] = contributor;
  };

  _.each(contributorEntries, updateContributor);

  const contributors = _.map(contributorMap);

  const aggregateContributionCount = (acc, contributor) => {
    acc += contributor.contributions;
    return acc;
  };
  const commitCount = _.reduce(contributors, aggregateContributionCount, 0);

  const contributorCount = _.size(contributors);

  const repoCount = _.size(repos);

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ repoCount, commitCount, contributorCount }),
  };
  return response;
};
