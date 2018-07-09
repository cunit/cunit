import Toolchain from "./Toolchain"
import BuildType from "./BuiltType"
import {CompilerType, Architecture, ProcessorNodeMap, System} from "./BuildConstants"
import GetLogger from '../Log'
import Tool from './Tool'
import {getValue} from "typeguard"
import Dependency from "./Dependency"

const
  sh = require("shelljs"),
  log = GetLogger(__filename),
  File = require("../util/File"),
  _ = require('lodash')


/**
 * Implement complex variable resolution
 *
 * @param project
 * @param context
 * @param processedConfigs
 */
function resolveConfigVariables(project, context = null, processedConfigs = []) {

}

/**
 * Main project structure
 */
export default class Project {
  constructor(path = sh.pwd(), rootProject = null, isTool = false, depConfig = {}) {
    
    let realRootProject = rootProject
    while (realRootProject && realRootProject.rootProject) {
      realRootProject = realRootProject.rootProject
    }
    
    rootProject = realRootProject
    
    this.rootProject = rootProject
    this.projectDir = path
    
    this.isTool = isTool
    this.toolsDir = `${path}/.cunit/tools`
    this.toolsRoot = `${this.toolsDir}/root`
    this.toolsBuildType = rootProject ?
      rootProject.toolsBuildType :
      new BuildType(this, Toolchain.host, true)
    
    this.config = {}
    this.configFiles = []
    this.toolchains = getValue(() => rootProject.toolchains, [])
    this.buildTypes = getValue(() => rootProject.buildTypes, [])
    
    // LOAD THE PROJECT CONFIGURATION
    const cunitFile = require("./Configure").findCUnitConfigFile(path)
    if (!cunitFile)
      throw `No cmake file found in: ${path}`
    
    // BUILD CONFIGURATION
    const cunitFiles = [cunitFile, `${path}/cunit.local.yml`]
    
    cunitFiles.forEach(file => {
      if (File.exists(file)) {
        this.loadConfigFile(file)
      } else {
        log.info(`CUnit file (${file}) does not exist`)
      }
    })
    
    // MERGE DEPENDENCY CONFIG, THIS FORCES OPTIONS INTO THE DEPENDENCY
    // FROM A HIGHER LEVEL PROJECT
    _.merge(this.config, depConfig)
    
    // SET THE PROJECT NAME
    this.name = this.config.name || _.last(_.split(path, "/"))
    this.android = [true, "true"].includes(getValue(() => this.rootProject.config, this.config).android)
    
    resolveConfigVariables(this)
    
    if (this.android) {
      log.info("Android mode, will use dynamic toolchain")
    } else {
      log.debug(`Assembling toolchains and build types: ${this.name}`)
      if (!this.buildTypes.length)
        BuildType.configureProject(this)
    }
    
    // CONFIGURE DEPENDENCIES
    Dependency.configureProject(this, isTool)
    
    // BUILD TOOLS UP NO MATTER WHAT
    Tool.configureProject(this)
    
    log.debug(`Loaded project: ${this.name}`)
  }
  
  loadConfigFile(path) {
    log.debug(`Loading: ${path}`)
    if (!File.exists(path)) {
      log.warn(`Unable to load: ${path}`)
      return
    }
    this.configFiles.push(path)
    _.merge(this.config, File.readFileYaml(path))
  }
  
  
  /**
   * Get sorted and ordered, unique dependencies
   * @returns {*|void}
   */
  
  static get dependencyGraph() {
    return Dependency.toDependencyGraph()
  }
  
  static get toolDependencyGraph() {
    return Tool.toDependencyGraph()
  }
  
  
}


Object.assign(Project, {
  System,
  Processor: Architecture,
  CompilerType
})

