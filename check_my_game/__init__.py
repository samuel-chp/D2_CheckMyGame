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
    def hello():
        return render_template('index.html')

    return app

