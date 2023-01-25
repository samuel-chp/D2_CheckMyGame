import os
from flask import Flask, render_template
from flask_cors import CORS, cross_origin
from check_my_game.config import Config


def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)
    
    cors = CORS(app)

    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/player')
    def player():
        return render_template('player.html')

    @app.route('/carnageReport')
    def carnageReport():
        return render_template('carnageReport.html')

    return app

# flask --app check_my_game --debug run
