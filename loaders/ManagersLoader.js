const MiddlewaresLoader     = require('./MiddlewaresLoader');
const ApiHandler            = require("../managers/api/Api.manager");
const LiveDB                = require('../managers/live_db/LiveDb.manager');
const UserServer            = require('../managers/http/UserServer.manager');
const ResponseDispatcher    = require('../managers/response_dispatcher/ResponseDispatcher.manager');
const VirtualStack          = require('../managers/virtual_stack/VirtualStack.manager');
const ValidatorsLoader      = require('./ValidatorsLoader');
const ResourceMeshLoader    = require('./ResourceMeshLoader');
const MongoLoader           = require('./MongoLoader');
const RepositoriesLoader    = require('./RepositoriesLoader');
const utils                 = require('../libs/utils');

const systemArch            = require('../static_arch/main.system');
const TokenManager          = require('../managers/token/Token.manager');
const SharkFin              = require('../managers/shark_fin/SharkFin.manager');
const TimeMachine           = require('../managers/time_machine/TimeMachine.manager');
const Auth                  = require('../managers/entities/auth/Auth.manager');
const School                = require('../managers/entities/school/School.manager');
const Classroom             = require('../managers/entities/classroom/Classroom.manager');
const Student               = require('../managers/entities/student/Student.manager');
const Security              = require('../managers/security/Security.manager');
const Observability         = require('../managers/observability/Observability.manager');
const Audit                 = require('../managers/audit/Audit.manager');

/** 
 * load sharable modules
 * @return modules tree with instance of each module
*/
module.exports = class ManagersLoader {
    constructor({ config, cortex, cache, oyster, aeon }) {

        this.managers   = {};
        this.config     = config;
        this.cache      = cache;
        this.cortex     = cortex;
        
        this._preload();
        this.injectable = {
            utils,
            cache, 
            config,
            cortex,
            oyster,
            aeon,
            managers: this.managers, 
            validators: this.validators,
            mongomodels: this.mongomodels,
            repositories: this.repositories,
            resourceNodes: this.resourceNodes,
        };
        
    }

    _preload(){
        const validatorsLoader    = new ValidatorsLoader({
            models: require('../managers/_common/schema.models'),
            customValidators: require('../managers/_common/schema.validators'),
        });
        const resourceMeshLoader  = new ResourceMeshLoader({})
        const mongoLoader         = new MongoLoader({ schemaExtension: "mongoModel.js" });
        const mongomodels         = mongoLoader.load();
        const repositoriesLoader  = new RepositoriesLoader({ mongomodels });

        this.validators           = validatorsLoader.load();
        this.resourceNodes        = resourceMeshLoader.load();
        this.mongomodels          = mongomodels;
        this.repositories         = repositoriesLoader.load();

    }

    load() {
        this.managers.responseDispatcher  = new ResponseDispatcher();
        this.managers.liveDb              = new LiveDB(this.injectable);
        const middlewaresLoader           = new MiddlewaresLoader(this.injectable);
        const mwsRepo                     = middlewaresLoader.load();
        const { layers, actions }         = systemArch;
        this.injectable.mwsRepo           = mwsRepo;
        /*****************************************CUSTOM MANAGERS*****************************************/
        this.managers.shark               = new SharkFin({ ...this.injectable, layers, actions });
        this.managers.timeMachine         = new TimeMachine(this.injectable);
        this.managers.token               = new TokenManager(this.injectable);
        this.managers.security            = new Security(this.injectable);
        this.managers.observability       = new Observability(this.injectable);
        this.managers.audit               = new Audit(this.injectable);
        this.managers.auth                = new Auth(this.injectable);
        this.managers.school              = new School(this.injectable);
        this.managers.classroom           = new Classroom(this.injectable);
        this.managers.student             = new Student(this.injectable);
        /*************************************************************************************************/
        this.managers.mwsExec             = new VirtualStack({ ...{ preStack: [/* '__token', */'__requestMeta','__device',] }, ...this.injectable });
        this.managers.userApi             = new ApiHandler({...this.injectable,...{prop:'httpExposed'}});
        this.managers.userServer          = new UserServer({ config: this.config, managers: this.managers });

       
        return this.managers;

    }

}
