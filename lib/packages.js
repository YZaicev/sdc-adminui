var _ = require('underscore');
var sprintf = require('util').format;

module.exports = {};

module.exports.add = function(req, res, next) {
    var params = req.body;
    var pkgclient = req.sdc[req.dc].papi;

    if (!params.owner_uuid || params.owner_uuid.length === 0) {
        delete params.owner_uuid;
    }

    req.log.info(params, 'papi.add');

    pkgclient.add(params, function(err, pkg) {
        if (err) {
            req.log.fatal(err);
            return next(err);
        } else {
            res.send(pkg);
            return next();
        }
    });
};



module.exports.del = function(req, res, next) {
    var pkgclient = req.sdc[req.dc].papi;
    pkgclient.del(req.params.uuid, function(err, pkg) {
        if (err) {
            return next(err);
        } else {
            res.send(pkg);
            return next();
        }
    });
};


module.exports.get = function(req, res, next) {
    var pkgclient = req.sdc[req.dc].papi;
    pkgclient.get(req.params.uuid, function(err, pkg) {
        if (err) {
            return next(err);
        } else {
            res.send(pkg);
            return next();
        }
    });
};


module.exports.update = function(req, res, next) {
    var pkgclient = req.sdc[req.dc].papi;

    pkgclient.get(req.params.uuid, {}, function(err, pkg) {
        if (err) {
            req.log.fatal(err, 'error retrieving package for upgrade');
            return next(err);
        }

        var changes = req.body;
        for (var k in req.body) {
            if (typeof(changes[k]) === 'string' && changes[k].length === 0) {
                delete changes[k];
            }
        }


        if (!changes.owner_uuid || changes.owner_uuid.length === 0) {
            delete changes.owner_uuid;
        }


        req.log.info(
            {uuid: req.params.uuid, changes: changes},
            'sdc-clients.package.update'
        );

        pkgclient.update(pkg.uuid, changes, function(err) {
            if (err) {
                req.log.fatal(err, 'error updating package');
                return next(err);
            }
            done();
        });
    });

    function done() {
        module.exports.get(req, res, next);
    }
};



module.exports.list = function(req, res, next) {
    var pkgclient = req.sdc[req.dc].papi;

    req.log.info(req.query, 'pkg.list');

    var query = req.query;
    var filter = [];

    _.each(query, function(v, k) {
        if (typeof(v) === 'string' && v.length) {
            if (k === 'uuid' || v === "true" || v === "false") {
                filter.push(sprintf("(%s=%s)", k, v));
            } else {
                filter.push(sprintf("(%s=*%s*)", k, v));
            }
            return;
        }

        if (typeof(v) === 'object') {
            if (k === 'owner_uuids') {
                filter.push(sprintf("(%s=%s)", k, v[0]));
                return;
            }
            Object.keys(v).forEach(function(op) {
                filter.push(sprintf("(%s%s%s)", k, op, v[op]));
            });
            return;
        }
    });

    var ldapfilter = sprintf("(&%s)", filter.join(''));
    var listParams = {filter: ldapfilter, sort: 'name'};

    req.log.info(listParams, 'pkg.list params');

    pkgclient.list({filter: filter}, {sort: 'name'}, function(err, packages) {
        if (err) {
            return next(err);
        }

        res.send(packages);
        return next();
    });
};
