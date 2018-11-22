import * as path from 'path'

import * as express from 'express'
import * as Promise from 'bluebird'

import { Sequelize, Models } from 'sequelize'

export interface Database {
  sequelize: Sequelize
  models: {}
}

export interface User {
  id: number,
  username: string,
  email: string,
  siteId: number
}

/* --------------- Image Service --------------- */
export type FileNameFormatter = (filename: string) => string
export type URLFormatter = (filename: string) => string
export interface ImageResource {
  url: string,
  identifier: string
}
export interface ImageService {
  getExpressUploadMiddleware (uploadPath: string, urlFormatter: URLFormatter,
    fieldName?: string, fileNameFormatter?: FileNameFormatter): express.RequestHandler
  getImages (urlFormatter: URLFormatter): Promise<NCResponse<ImageResource>>
  deleteImage (uploadPath: string, fileName: string): Promise<NCResponse<null>>
}

export interface ImageServiceConstructable {
  new (sequelize: Sequelize, models: Models): ImageService
}

// Database format needed to use Image Service
export function addImageModel (sequelize: Sequelize, models: Models) {
  models.Image = sequelize.define('images', {
    id: { type: sequelize.Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    filename: { type: sequelize.Sequelize.STRING, unique: true },
    url: { type: sequelize.Sequelize.TEXT }
  })
}
/* ------------------------------------------------ */

export interface Services {
  ImageService: ImageServiceConstructable
}

export interface Site {
  id: number,
  templateId: string,
  name: string,
  dbName: string,
  hash: string
}

export interface SiteData {
  site: Site,
  user: User,
  socketIO: SocketIO,
  db: Database,
  viewPath: string,
  baseDir?: string,
  assetPath?: string,
  services: Services
}

export type SocketIO = any

export interface DBStructure {
  // Return models
  addTables (sequelize: Sequelize, models: {}): {}
}

/* --------------- App Controller --------------- */
export abstract class AppController {
  readonly router: express.Express
  protected viewPath: string
  protected assetsPath: string
  protected siteData: SiteData
  protected interceptors: express.RequestHandler[] = []

  constructor (data: SiteData) {
    this.siteData = data
    this.router = express()
    // TODO: __dirname is not necessary
    this.viewPath = data.viewPath || path.join(__dirname, 'views')
    this.assetsPath = data.assetPath || path.join(this.viewPath, '/assets')

    this.router.set('views', this.viewPath)
    this.router.set('view engine', 'pug')
    this.router.use('/assets', express.static(this.assetsPath, { maxAge: '1h' }))
  }
  // Initialize the class. The reason this can't be done using constructor is because
  // we may have to wait until the initialization is compelte before preceeding
  initialize (): Promise<null> {
    return Promise.resolve(null)
  }

  // Whether the instance is still valid or not (i.e. there are updated files)
  isUpToDate (): Promise<boolean> {
    return Promise.resolve(true)
  }

  getInitData (): SiteData {
    return this.siteData
  }

  getDb (): Database {
    return this.siteData.db
  }

  getSite (): Site {
    return this.siteData.site
  }

  protected extendInterceptors (...fns: express.RequestHandler[]) {
    return this.interceptors.concat(fns)
  }

  protected addInterceptor (...fns: express.RequestHandler[]) {
    this.interceptors = this.extendInterceptors(...fns)
  }

  routeAll (path, ...fns: express.RequestHandler[]) {
    this.router.all(path, this.extendInterceptors(...fns))
  }

  routeGet (path, ...fns: Array<express.RequestHandler>) {
    this.router.get(path, this.extendInterceptors(...fns))
  }

  routePost (path, ...fns: Array<express.RequestHandler>) {
    this.router.post(path, this.extendInterceptors(...fns))
  }

  routeUse (path, ...fns: Array<express.RequestHandler>) {
    this.router.use(path, this.extendInterceptors(...fns))
  }

  // When the instance of the class is no longer valid,
  // we have to evict out the cache so re-instantiation is clean
  evictRequireCache (): Promise<null> {
    return Promise.resolve(null)
  }

  getRouter (): express.Express {
    return this.router
  }
}
/* ---------------------------------------------- */

/* --------------- CMS Controller --------------- */
export abstract class CMSController {
  readonly siteHash: string
  readonly router: express.Express
  readonly subRouter: express.Express
  protected viewPath: string
  protected assetsPath: string
  protected interceptors: Array<any> = []
  readonly siteData: SiteData

  constructor (siteData: SiteData, useSubrouter = true) {
    this.siteData = siteData
    this.siteHash = siteData.site.hash
    // Since the path is prefixed with /:hash/, we don't wanna handle it manually everytime, hence we use two routers
    this.router = express()
    if (useSubrouter) {
      this.subRouter = express()
      this.router.use(`/${this.siteHash}`, this.subRouter)
    } else {
      this.subRouter = this.router
    }
    this.subRouter.locals.rootifyPath = this.rootifyPath.bind(this)
    // Used for pug path that starts with /
    this.subRouter.locals.basedir = siteData.baseDir
    this.viewPath = siteData.viewPath
    this.assetsPath = siteData.assetPath || path.join(this.viewPath, '/assets')
    this.subRouter.use('/assets', express.static(this.assetsPath))
    this.subRouter.set('views', this.viewPath)
    this.subRouter.set('view engine', 'pug')
  }

  // Since we're using /:hash/path, we have to prepend :hash
  // as the root of the path, when referring to an asset
  protected rootifyPath (filename) {
    if (this.siteHash) {
      return `/${this.siteHash}/${filename}`
    } else {
      return `/${filename}`
    }
  }

  protected extendInterceptors (...fns: express.RequestHandler[]) {
    return this.interceptors.concat(fns)
  }

  protected addInterceptor (...fns: express.RequestHandler[]) {
    this.interceptors = this.extendInterceptors(...fns)
  }

  routeAll (path: string, ...fns: express.RequestHandler[]) {
    this.subRouter.all(path, this.extendInterceptors(...fns))
  }

  routeGet (path: string, ...fns: Array<express.RequestHandler>) {
    this.subRouter.get(path, this.extendInterceptors(...fns))
  }

  routePost (path: string, ...fns: Array<express.RequestHandler>) {
    this.subRouter.post(path, this.extendInterceptors(...fns))
  }

  routeUse (path: string, ...fns: Array<express.RequestHandler>) {
    this.subRouter.use(path, this.extendInterceptors(...fns))
  }

  getRouter (): express.Express {
    return this.router
  }

  abstract getSidebar (): any[]
}
/* ---------------------------------------------- */
