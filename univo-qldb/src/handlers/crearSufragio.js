/* Funcion lambda que implementa la funcionalidad de crear sufragio
 */
const { Logger, injectLambdaContext } = require('@aws-lambda-powertools/logger');
const { Tracer, captureLambdaHandler } = require('@aws-lambda-powertools/tracer');
const { Metrics, MetricUnits, logMetrics } = require('@aws-lambda-powertools/metrics');
const middy = require('@middy/core');
const date = require('date-and-time');
const { crearSufragio } = require('./helper/sufragio');
const sufragioError = require('./lib/sufragioError');
const cors = require('@middy/http-cors');

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

tracer.captureAWS(require('aws-sdk'));

const handler = async (event) => {
    const {
        codigo, dui, departamento, municipio, sexo, uuid
    } = JSON.parse(event.body);
    
    logger.debug(`Creacion de sufragio con los datos: Codigo: ${codigo}, DUI: ${dui}, Departamento: ${departamento}, Municipio: ${municipio}, Sexo: ${sexo} y uuid: ${uuid}`);

    try {
        const eventInfo = { eventName: 'ingresoCentroVotacion', status: 0, eventDate: date.format(new Date(), 'YYYY/MM/DD HH:mm:ss') };
        const response = await crearSufragio(
            logger, codigo, dui, departamento, municipio, sexo, uuid, eventInfo
        );
        metrics.addMetric('creacionSufragioExitoso', MetricUnits.Count, 1);
        return {
            statusCode: 201,
            body: JSON.stringify(response),
        };
    } catch (error) {
        if (error instanceof sufragioError) {
            return error.getHttpResponse();
        }
        metrics.addMetric('creacionSufragioFallido', MetricUnits.Count, 1);
        logger.error(`Error regresado: ${error}`);
        const errorBody = {
            status: 500,
            title: error.name,
            detail: error.message,
        };
        return {
            statusCode: 500,
            body: JSON.stringify(errorBody),
        };
    }
};

module.exports.handler = middy(handler)
    .use(injectLambdaContext(logger))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .use(cors());